import * as path from 'node:path';
import * as fs from 'node:fs';
import { Inject, Service } from 'typedi';
import { filesDir, videosDir } from '@/paths';
import { WebService, CryptoService } from '@/services';
import { VideoRepository } from '@/repositories';
import { jsLiteralToJSON } from '@/utils';
import { DownloadProgress } from '@/types';

export type VideoUrl = {
  hashId: string;
  title: string;
  href: string;
  img: string;
};

export type ModelUrl = {
  hashId: string;
  name: string;
  href: string;
};

export type TagUrl = {
  hashId: string;
  name: string;
  href: string;
};

export type VideoMeta = {
  title: string;
  rating: number;
  addDate: Date;
  models: ModelUrl[];
  tags: TagUrl[];
  videoPath: string;
  picturesPath: string;
};

export type VideoDownloadResult = {
  fileName: string;
  filePath: string;
  fileSize: number;
};

@Service()
export class VideoService {
  @Inject(() => WebService)
  private readonly webService!: WebService;

  @Inject(() => CryptoService)
  private readonly cryptoService!: CryptoService;

  @Inject(() => VideoRepository)
  private readonly videoRepository!: VideoRepository;

  async getVideoUrlsForPage(page: number) {
    const $ = await this.webService.getVideosPage(page);
    const tags = $('.photoslider > .modelfeature');
    return tags
      .map((i, el) => {
        const hrefEm = $(el).find('.modelimg a');
        const imgEm = $(hrefEm).find('img');

        const href: string = hrefEm.attr('href')!;
        return {
          hashId: this.cryptoService.sha256(href),
          title: hrefEm.attr('title')!,
          href,
          img: imgEm.attr('src0_1x') || imgEm.attr('src')!,
        } satisfies VideoUrl;
      })
      .get<VideoUrl>();
  }

  async getVideoUrls(untilLatestStored = true) {
    const lastStoredVideo = untilLatestStored ? await this.videoRepository.getLastStoredVideo() : null;

    const videoUrls: VideoUrl[] = [];
    let page = 1;
    let hasMore = true;
    do {
      console.info(`Getting video urls for page ${page}`);
      const urls = await this.getVideoUrlsForPage(page);
      hasMore = urls.length > 0;

      if (!hasMore) {
        console.info('No more videos found');
      } else if (lastStoredVideo) {
        const lastStoredIndex = urls.findIndex((url) => url.hashId === lastStoredVideo.hashId);
        if (lastStoredIndex >= 0) {
          urls.splice(lastStoredIndex);
          hasMore = false;
          console.info('Last stored video found, stopping');
        }
      }

      // TODO: Remoe this line
      hasMore = false;

      videoUrls.push(...urls);
      page++;
    } while (hasMore);

    return videoUrls;
  }

  async getVideoMeta(videoUrl: string): Promise<VideoMeta> {
    const $ = await this.webService.getVideoPage(videoUrl);
    const title = $('.pagetitle h1:first').text().trim();
    const rating = parseFloat($('.pagetitle:first .rating_box').attr('data-rating') || '0');

    const blogDetailsEm = $('.blogdetails');
    const addDate = blogDetailsEm
      .find('h4:first')
      .text()
      .replace(/[^\d]*/is, '')
      .trim();
    const models = blogDetailsEm
      .find('.update_models a')
      .map((i, el) => {
        const $el = $(el);
        const href = $el.attr('href')!;
        return {
          hashId: this.cryptoService.sha256(href),
          name: $el.text().trim(),
          href,
        } satisfies ModelUrl;
      })
      .get<ModelUrl>();

    const tags = $('.indvideo .group:first .top_navbar li a')
      .map((i, el) => {
        const $el = $(el);
        const href = $el.attr('href')!;
        return {
          hashId: this.cryptoService.sha256(href),
          name: $el.text().trim(),
          href,
        } satisfies TagUrl;
      })
      .get<TagUrl>();

    const scriptEm = $('#download_form + script');
    const rx = /.+?movie\["fullmp4"\]\[".+?"\] .*?=.*? ({.+?})/s;
    const mt = scriptEm.text().match(rx);

    const videoPath = mt ? JSON.parse(jsLiteralToJSON(mt[1])).path : null;

    const picturesPath = $('.subnav .content_tab_wrapper li:nth-child(2) a').attr('href')!;

    return {
      title,
      rating,
      addDate: new Date(addDate),
      models,
      tags,
      videoPath,
      picturesPath,
    };
  }

  public async downloadVideo(hashId: string, videoUrl: string, onProgress?: (progress: DownloadProgress) => void): Promise<VideoDownloadResult> {
    // Extract filename from videoPath
    const fileName = path.basename(videoUrl);

    // Create a folder name combining hashId and filename (without extension)
    const fileNameNoExt = path.parse(fileName).name;
    const folderName = `${hashId}_${fileNameNoExt}`;

    // Define full folder path
    const targetFolder = path.join(videosDir, folderName);

    // Create the folder if it doesn't exist
    fs.mkdirSync(targetFolder, { recursive: true });

    // Build full output path for the video
    const targetFilePath = path.join(targetFolder, fileName);

    // Get the stream
    const response = await this.webService.getVideoStream(videoUrl);
    const writer = fs.createWriteStream(targetFilePath);
    response.data.pipe(writer);

    const totalSize = parseInt(response.headers['content-length'] || '0', 10);
    let downloaded = 0;
    const startTime = Date.now();

    // Listen for data events to track progress
    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;

      const elapsedSec = (Date.now() - startTime) / 1000;
      const estimatedSpeed = downloaded / elapsedSec; // bytes/sec
      let estimatedTime = 0;

      if (totalSize > 0 && downloaded < totalSize) {
        const remainingBytes = totalSize - downloaded;
        estimatedTime = remainingBytes / estimatedSpeed; // seconds
      }

      if (onProgress) {
        onProgress({
          totalSize,
          downloaded,
          startTime,
          estimatedSpeed,
          estimatedTime,
        });
      }
    });

    // Return a promise which resolves after download
    return new Promise<VideoDownloadResult>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Video downloaded: ${targetFilePath}`);
        resolve({
          fileName,
          filePath: path.relative(filesDir, targetFilePath),
          fileSize: totalSize,
        });
      });
      writer.on('error', (err) => {
        console.error(`Error downloading video: ${videoUrl}`, err);
        // Cleanup file if it was created
        if (fs.existsSync(targetFilePath)) {
          fs.unlinkSync(targetFilePath);
        }
        reject(err);
      });
    });
  }
}
