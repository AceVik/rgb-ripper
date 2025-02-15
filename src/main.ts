import { Inject, Service } from 'typedi';
import { intervalToDuration } from 'date-fns';
import prettyBytes from 'pretty-bytes';
import { WebService, VideoService, TagService, ModelService, DownloadService, DownloadProgress, StreamDownloadProgress, CryptoService } from '@/services';
import { AxiosError } from 'axios';
import process from 'node:process';
import { Video } from '@/entities';

/**
 * Converts seconds to a hh:mm:ss formatted string.
 */
function toHHMMSS(sec: number): string {
  const duration = intervalToDuration({ start: 0, end: sec * 1000 });
  const h = String(duration.hours ?? 0).padStart(2, '0');
  const m = String(duration.minutes ?? 0).padStart(2, '0');
  const s = String(duration.seconds ?? 0).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Writes download progress (byte-based) to the terminal.
 * @param progress Object containing totalSize, downloaded, etc.
 * @param videoTitle Title to be shown in the output.
 */
export function handleDownloadProgress(progress: DownloadProgress, videoTitle: string) {
  try {
    const { totalSize = 0, downloaded = 0, estimatedSpeed = 0, estimatedTime = 0 } = progress;
    const percent = totalSize ? ((downloaded / totalSize) * 100).toFixed(2) : '??';
    const downloadedStr = prettyBytes(downloaded);
    const totalSizeStr = totalSize > 0 ? prettyBytes(totalSize) : '??';
    const speedStr = prettyBytes(estimatedSpeed) + '/s';
    const remainingStr = totalSize > 0 ? prettyBytes(totalSize - downloaded) : '??';
    const remainingTimeStr = toHHMMSS(estimatedTime);

    process.stdout.write(
      `\r[${videoTitle}] ${percent}% (${speedStr}, ${downloadedStr} of ${totalSizeStr}, remaining ${remainingStr}, ${remainingTimeStr})                          `,
    );
  } catch {
    // Ignore errors in progress handling
  }
}

/**
 * Writes stream download progress (segment-based) to the terminal.
 * @param progress Object containing totalParts, downloadedParts, etc.
 * @param videoTitle Title to be shown in the output.
 */
export function handleStreamDownloadProgress(progress: StreamDownloadProgress, videoTitle: string) {
  try {
    const { totalParts, downloadedParts, estimatedSpeed, estimatedTime } = progress;
    const percent = totalParts ? ((downloadedParts / totalParts) * 100).toFixed(2) : '??';
    const speedStr = prettyBytes(estimatedSpeed) + '/s';
    const remainingTimeStr = toHHMMSS(estimatedTime);

    process.stdout.write(
      `\r[${videoTitle}] ${percent}% (${speedStr}, ${downloadedParts}/${totalParts} parts, remaining ${remainingTimeStr})                          `,
    );
  } catch {
    // Ignore errors in progress handling
  }
}

@Service()
export class Main {
  @Inject(() => WebService)
  private readonly webService!: WebService;

  @Inject(() => VideoService)
  private videoService!: VideoService;

  @Inject(() => TagService)
  private readonly tagService!: TagService;

  @Inject(() => ModelService)
  private readonly modelService!: ModelService;

  @Inject(() => DownloadService)
  private readonly downloadService!: DownloadService;

  @Inject(() => CryptoService)
  private readonly cryptoService!: CryptoService;

  async run() {
    try {
      if (!(await this.webService.login())) {
        console.error('Failed to login. - maybe invalid credentials. Exiting.');
        process.exit(1);
      }
    } catch (err: unknown) {
      if ((err as AxiosError).response?.status === 403) {
        console.error('Download limit reached for today. Exiting.');
        process.exit(1);
      }

      console.error('Failed to run', err);
    }

    await this.syncVideos();
  }

  async syncVideos() {
    const videoUrls = (await this.videoService.getVideoUrls()).reverse();
    if (videoUrls.length === 0) {
      console.info('No new videos found');
      return;
    }

    let idx = 0;
    for (const videoUrl of videoUrls) {
      idx++;
      try {
        console.info(`Processing video ${idx} of ${videoUrls.length} ${videoUrl.title} [${videoUrl.href}]`);
        let video = await this.videoService.createVideoIfNotExists(videoUrl);

        if (video.status === 'ready') {
          // Create SHA512 hash for existing videos (if not already present)
          if (!video.sha512) {
            console.log(`Creating SHA512 hash for existing video ${video.title}`);
            const [sha512, sha512Stream] = await Promise.all([
              this.cryptoService.hashFile(video.filePath!),
              this.cryptoService.hashFile(video.streamFilePath!),
            ]);
            return await this.videoService.updateVideo(video, { sha512, sha512Stream });
          }

          continue;
        } else if (video.status === 'todo') {
          const meta = await this.videoService.getVideoMeta(videoUrl.href);

          const [models, tags] = await Promise.all([
            Promise.all(meta.models.map((model) => this.modelService.createModelIfNotExists(model))),
            Promise.all(meta.tags.map((tag) => this.tagService.createTagIfNotExists(tag))),
          ]);

          video = await this.videoService.updateVideo(video, {
            models,
            tags,
            meta,
            status: 'to-download-stream',
          });
        }

        if (video.status === 'to-download-stream') {
          const downloadResult = await this.downloadService.downloadVideoHls(videoUrl.hashId, video.streamUrl!, (progress) =>
            handleStreamDownloadProgress(progress, videoUrl.title),
          );

          console.log(`Creating SHA512 hash for downloaded stream ${video.title}`);
          const sha512Stream = await this.cryptoService.hashFile(downloadResult.filePath);

          video = await this.videoService.updateVideo(video, {
            downloadResult,
            sha512Stream,
            status: 'to-download-video',
          });
        }

        if (video.status === 'to-download-video') {
          try {
            const [downloadResult, picturesDir] = await Promise.all([
              this.downloadService.downloadVideo(videoUrl.hashId, video.downloadUrl!, (progress) => handleDownloadProgress(progress, videoUrl.title)),
              this.downloadService.downloadPictureForVideo(video, ...(await this.videoService.getVideoPictureUrls(video.picturesUrl!))),
              async () => {
                if (!video.sha512Stream) {
                  console.log();
                  console.log(`Creating SHA512 hash for downloaded stream ${video.title}`);
                  const sha512Stream = await this.cryptoService.hashFile(video.streamFilePath!);
                  video = await this.videoService.updateVideo(video, { sha512Stream });
                }
              },
            ]);

            if (!!downloadResult) {
              console.log(`Creating SHA512 hash for downloaded video ${video.title}`);
              const sha512 = await this.cryptoService.hashFile(downloadResult.filePath);

              video = await this.videoService.updateVideo(video, {
                downloadResult,
                picturesDir,
                sha512,
                status: 'ready',
              });
            }
          } catch {
            continue;
          }
        }
      } catch (err: unknown) {
        const responseStatus = (err as AxiosError).status || (err as AxiosError).response?.status;
        if (responseStatus === 403) {
          console.log('Download limit reached. Exiting.');
          process.exit(1);
        }

        console.error(`Failed to process video ${videoUrl.title} [${videoUrl.href}]`, responseStatus);
      }
    }
  }
}
