import { Inject, Service } from 'typedi';
import { intervalToDuration } from 'date-fns';
import prettyBytes from 'pretty-bytes';
import { WebService, VideoService, TagService, ModelService } from '@/services';
import { DownloadProgress } from '@/types';

function toHHMMSS(sec: number): string {
  // Wandelt Sekunden in {hours, minutes, seconds}, dann in hh:mm:ss
  const duration = intervalToDuration({ start: 0, end: sec * 1000 });
  const h = String(duration.hours ?? 0).padStart(2, '0');
  const m = String(duration.minutes ?? 0).padStart(2, '0');
  const s = String(duration.seconds ?? 0).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Schreibt Fortschrittsinformationen in einer Zeile ins Terminal.
 * @param progress Objekt mit totalSize, downloaded usw.
 * @param videoTitle Titel, der in der Ausgabe gezeigt werden soll
 */
export function handleDownloadProgress(progress: DownloadProgress, videoTitle: string) {
  const { totalSize = 0, downloaded = 0, estimatedSpeed = 0, estimatedTime = 0 } = progress;

  // Prozentualer Fortschritt (falls totalSize vorhanden)
  const percent = totalSize ? ((downloaded / totalSize || 1) * 100).toFixed(2) : '??';

  // Menschlich lesbare Angaben
  const downloadedStr = prettyBytes(downloaded);
  const totalSizeStr = totalSize > 0 ? prettyBytes(totalSize) : '??';
  const speedStr = prettyBytes(estimatedSpeed) + '/s';
  const remainingStr = totalSize > 0 ? prettyBytes(totalSize - downloaded) : '??';

  // Verbleibende Zeit als hh:mm:ss
  const remainingTimeStr = toHHMMSS(estimatedTime);

  process.stdout.write(
    `\r[${videoTitle}] ${percent}% (${speedStr}, ` + `${downloadedStr} of ${totalSizeStr}, ` + `remaining ${remainingStr}, ${remainingTimeStr})`,
  );
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

  async run() {
    if (!(await this.webService.login())) {
      throw new Error('Failed to login');
    }

    await this.syncVideos();
  }

  async syncVideos() {
    const videoUrls = (await this.videoService.getVideoUrls()).reverse();
    if (videoUrls.length <= 0) {
      console.info('No new videos found');
      return;
    }

    for (const videoUrl of videoUrls) {
      console.info(`Processing video ${videoUrl.title} [${videoUrl.href}]`);
      const videoMeta = await this.videoService.getVideoMeta(videoUrl.href);
      const [dlRsp] = await Promise.all([
        this.videoService.downloadVideo(videoUrl.hashId, videoMeta.videoPath, (progress) => handleDownloadProgress(progress, videoUrl.title)),
        Promise.all(videoMeta.models.map((model) => this.modelService.createModelIfNotExists(model))),
        Promise.all(videoMeta.tags.map((tag) => this.tagService.createTagIfNotExists(tag))),
      ]);
    }
  }
}
