import fs from 'node:fs';
import path from 'node:path';
import { Inject, Service } from 'typedi';
import { AxiosResponse } from 'axios';
import { WebService, HlsService, FfmpegService } from '@/services';
import { filesDir, videosDir } from '@/paths';
import { Video } from '@/entities';
import { createQueue } from '@/utils/async-queue';

export type VideoDownloadResult = {
  fileName: string;
  filePath: string;
  fileSize: number;
};

export type DownloadProgress = {
  totalSize: number;
  downloaded: number;
  startTime: number;
  estimatedSpeed: number; // bytes per second
  estimatedTime: number; // remaining seconds
};

export type StreamDownloadProgress = {
  totalParts: number;
  downloadedParts: number;
  startTime: number;
  estimatedSpeed: number; // bytes per second
  estimatedTime: number; // remaining seconds
};

@Service()
export class DownloadService {
  @Inject(() => WebService)
  private readonly webService!: WebService;

  @Inject(() => HlsService)
  private readonly hlsService!: HlsService;

  @Inject(() => FfmpegService)
  private readonly ffmpegService!: FfmpegService;

  /**
   * Download a video file via a direct URL.
   */
  public async downloadVideo(hashId: string, videoUrl: string, onProgress?: (progress: DownloadProgress) => void): Promise<VideoDownloadResult | null> {
    const { fileName, targetFolder, targetFilePath } = this.prepareFilePaths(hashId, videoUrl);
    try {
      const response = await this.webService.getVideoStream(videoUrl);
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);

      // Falls bereits vollständig heruntergeladen, direkt zurückgeben
      if (this.isFileAlreadyComplete(targetFilePath, totalSize)) {
        console.log(`Video already downloaded: ${targetFilePath}`);
        return {
          fileName,
          filePath: path.relative(filesDir, targetFilePath),
          fileSize: totalSize,
        };
      }

      const maxAttempts = 3;
      let attempts = 0;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          return await this.tryDownloadVideo(hashId, videoUrl, onProgress);
        } catch (err: any) {
          console.error(`Download attempt ${attempts} failed: ${err.message}`);

          if (err.response.status === 403) {
            attempts = maxAttempts;
          }
          // Aufräumen des temporären Files, falls vorhanden
          this.cleanupFileOnError(`${targetFilePath}.temp`);
          if (attempts >= maxAttempts) {
            throw new Error(`Download failed after ${attempts} attempts: ${err.message}`);
          }
          await this.delay(1000); // kurze Pause vor dem nächsten Versuch
        }
      }
      throw new Error('Download failed unexpectedly');
    } catch (err: any) {
      console.error(`Error downloading video: ${videoUrl}`);
      return null;
    }
  }

  private async tryDownloadVideo(hashId: string, videoUrl: string, onProgress?: (progress: DownloadProgress) => void): Promise<VideoDownloadResult> {
    const { fileName, targetFolder, targetFilePath } = this.prepareFilePaths(hashId, videoUrl);
    const response = await this.webService.getVideoStream(videoUrl);
    const totalSize = parseInt(response.headers['content-length'] || '0', 10);

    if (this.isFileAlreadyComplete(targetFilePath, totalSize)) {
      console.log(`Video already downloaded: ${targetFilePath}`);
      return {
        fileName,
        filePath: path.relative(filesDir, targetFilePath),
        fileSize: totalSize,
      };
    }

    const tempFilePath = `${targetFilePath}.temp`;
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    let downloaded = 0;
    const startTime = Date.now();

    // Watchdog configuration:
    const maxInactivity = 60000; // max. 60 seconds without receiving data
    const checkInterval = 15000; // check every 15 seconds
    let lastChunkTime = Date.now();

    // Set up a watchdog timer that checks if the stream is stalled
    const watchdog = setInterval(() => {
      if (Date.now() - lastChunkTime > maxInactivity) {
        console.log();
        console.error('Download stalled: No data received in the last 30 seconds.');
        // Destroy the stream with an error to trigger the retry mechanism
        const error = new Error('Download stalled due to inactivity');
        response.data.destroy(error);
        writer.destroy(error);
        clearInterval(watchdog);
      }
    }, checkInterval);

    response.data.on('data', (chunk: Buffer) => {
      lastChunkTime = Date.now(); // reset watchdog timer on new data
      downloaded += chunk.length;
      const elapsedSec = (Date.now() - startTime) / 1000;
      const estimatedSpeed = downloaded / elapsedSec;
      const estimatedTime = totalSize > downloaded ? (totalSize - downloaded) / estimatedSpeed : 0;
      if (onProgress) {
        onProgress({ totalSize, downloaded, startTime, estimatedSpeed, estimatedTime });
      }
    });

    return new Promise<VideoDownloadResult>((resolve, reject) => {
      writer.on('finish', () => {
        clearInterval(watchdog); // clear watchdog on finish
        fs.renameSync(tempFilePath, targetFilePath);
        console.log();
        console.log(`Video downloaded: ${targetFilePath}`);
        resolve({
          fileName,
          filePath: path.relative(filesDir, targetFilePath),
          fileSize: totalSize,
        });
      });
      writer.on('error', (err) => {
        clearInterval(watchdog);
        console.error(`Error downloading video: ${videoUrl}`, err);
        this.cleanupFileOnError(tempFilePath);
        reject(err);
      });
    });
  }

  /**
   * Download an HLS video:
   * - Loads the master playlist and selects the best variant.
   * - Downloads alle TS segments parallel.
   * - Konvertiert anschließend die .ts Datei in eine .mp4 Datei.
   */
  public async downloadVideoHls(hashId: string, videoHlsUrl: string, onProgress?: (progress: StreamDownloadProgress) => void): Promise<VideoDownloadResult> {
    const { fileName, fileNameNoExt, targetFolder } = this.prepareFilePaths(hashId, videoHlsUrl);
    const mp4FileName = fileName.replace(/\.m3u8$/, '.stm.mp4');
    const targetMp4Path = path.join(targetFolder, mp4FileName);
    const tempTsPath = path.join(targetFolder, fileName.replace(/\.m3u8$/, '.ts'));

    if (fs.existsSync(targetMp4Path) && fs.statSync(targetMp4Path).size > 0) {
      console.log(`Video already downloaded: ${targetMp4Path}`);
      return {
        fileName: mp4FileName,
        filePath: path.relative(filesDir, targetMp4Path),
        fileSize: fs.statSync(targetMp4Path).size,
      };
    }

    // Master M3U8 laden und bestes Variant auswählen
    const masterContent = await this.webService.getAsText(videoHlsUrl);
    const variants = this.hlsService.parseMasterM3U8(masterContent.data);
    if (variants.length === 0) {
      throw new Error('No variants found in master M3U8');
    }
    const bestVariant = variants.reduce((prev, curr) => (curr.bandwidth > prev.bandwidth ? curr : prev));
    const mediaM3u8Url = this.hlsService.resolveM3U8Url(videoHlsUrl, bestVariant.uri);

    // Media M3U8 laden und TS-Segmente parsen
    const mediaContent = await this.webService.getAsText(mediaM3u8Url);
    const segmentPaths = this.hlsService.parseMediaM3U8(mediaContent.data);
    if (segmentPaths.length === 0) {
      throw new Error('No TS segments found in media M3U8');
    }

    const downloadStartTime = Date.now();
    let totalSize = 0;
    let totalDownloaded = 0;
    let downloadedParts = 0;
    let nextSegmentIndexToWrite = 0;
    let downloadedDuringDownload = 0;

    const tsWriter = fs.createWriteStream(tempTsPath);

    const downloadQueue = createQueue<AxiosResponse>(32);

    await Promise.all(
      segmentPaths.map((segment, index) => {
        return downloadQueue.add(async () => {
          const url = this.hlsService.resolveM3U8Url(mediaM3u8Url, segment);
          const response = await this.downloadSegmentWithRetry(url);
          totalSize += parseInt(response.headers['content-length'] || '0', 10);
          const buffer = Buffer.from(response.data);
          totalDownloaded += buffer.length;
          downloadedDuringDownload += buffer.length;
          downloadedParts++;

          // Report intermediate progress
          if (onProgress) {
            const elapsedSec = (Date.now() - downloadStartTime) / 1000;
            onProgress({
              totalParts: segmentPaths.length,
              downloadedParts,
              startTime: downloadStartTime,
              estimatedSpeed: downloadedDuringDownload / elapsedSec,
              estimatedTime: (segmentPaths.length - downloadedParts) / (downloadedParts / elapsedSec),
            });
          }

          // Warten, bis die Schreibreihenfolge erreicht ist
          while (index !== nextSegmentIndexToWrite) {
            await new Promise<void>((resolve) => setTimeout(resolve, 32));
          }
          tsWriter.write(buffer);
          nextSegmentIndexToWrite++;
          return response;
        });
      }),
    );

    await new Promise<void>((resolve, reject) => {
      tsWriter.end(() => resolve());
      tsWriter.on('error', reject);
    });

    tsWriter.close();

    // Konvertiere die TS Datei in MP4 und bereinige die temporäre Datei
    console.log();
    console.log('Converting TS to MP4...');
    await this.ffmpegService.convertTsToMp4(tempTsPath, targetMp4Path);
    if (fs.existsSync(targetMp4Path) && fs.statSync(targetMp4Path).size > 0) {
      fs.unlinkSync(tempTsPath);
    }

    console.log();
    console.log(`Video downloaded and converted: ${targetMp4Path}`);
    return {
      fileName: mp4FileName,
      filePath: path.relative(filesDir, targetMp4Path),
      fileSize: fs.statSync(targetMp4Path).size,
    };
  }

  /**
   * Downloads a TS segment with retry logic.
   * - Bei Unauthorized-Fehlern wird die Login-Methode aufgerufen.
   * - Bei Verbindungsfehlern wird 15s gewartet und unendlich oft erneut versucht.
   * - Bei anderen Fehlern wird bis zu 5 Mal wiederholt.
   */
  private async downloadSegmentWithRetry(url: string): Promise<AxiosResponse> {
    let attempts = 0;
    while (true) {
      try {
        return await this.webService.getAsArrayBuffer(url);
      } catch (err: any) {
        if (err?.status === 401 || (err?.message && err.message.toLowerCase().includes('unauthorized'))) {
          console.warn(`Unauthorized when accessing ${url}. Logging in and retrying.`);
          attempts = 0;
          await this.webService.login();
          continue;
        }
        if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNRESET' || err?.code === 'ECONNREFUSED') {
          console.warn(`Connection error for ${url}. Waiting 15s before retrying.`);
          attempts = 0;
          await this.delay(15000);
          continue;
        }
        attempts++;
        if (attempts > 5) {
          throw new Error(`Failed to download segment ${url} after 5 retries: ${err.message}`);
        }
        console.warn(`Error downloading ${url}: ${err.message}. Retrying attempt ${attempts}...`);
        await this.delay(1000);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Prepares folder structure and file paths.
   */
  private prepareFilePaths(hashId: string, videoUrl: string) {
    const fileName = path.basename(videoUrl);
    const fileNameNoExt = path.parse(fileName).name;
    const folderName = `${fileNameNoExt}_${hashId}`;
    const targetFolder = path.join(videosDir, folderName);
    fs.mkdirSync(targetFolder, { recursive: true });
    const targetFilePath = path.join(targetFolder, fileName);
    return { fileName, fileNameNoExt, folderName, targetFolder, targetFilePath };
  }

  /**
   * Checks whether a file exists and matches the expected size.
   */
  private isFileAlreadyComplete(targetFilePath: string, totalSize: number) {
    if (!fs.existsSync(targetFilePath) || totalSize === 0) {
      return false;
    }
    return fs.statSync(targetFilePath).size === totalSize;
  }

  /**
   * Deletes a file if it exists.
   */
  private cleanupFileOnError(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async downloadPictureForVideo(video: Video, ...pictureUrls: string[]) {
    if (!video.downloadUrl?.length) {
      throw new Error('Video has no download URL');
    }

    const { targetFolder } = this.prepareFilePaths(video.hashId, video.downloadUrl);
    const picturesDir = path.join(targetFolder, 'pictures');
    fs.mkdirSync(picturesDir, { recursive: true });

    const pictureQueue = createQueue(5);

    await Promise.all(
      pictureUrls.map((pictureUrl) => {
        return pictureQueue.add(async () => {
          const pictureFileName = path.basename(pictureUrl);
          const pictureFilePath = path.join(picturesDir, pictureFileName);
          const response = await this.webService.getAsArrayBuffer(pictureUrl);
          fs.writeFileSync(pictureFilePath, Buffer.from(response.data));
        });
      }),
    );

    return picturesDir;
  }
}
