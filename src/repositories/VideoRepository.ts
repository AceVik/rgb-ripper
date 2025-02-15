import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Model, Tag, Video, VideoStatus } from '@/entities';
import { VideoDownloadResult, VideoMeta, VideoUrl } from '@/services';

export type VideoData = {
  videoUrl: VideoUrl;
  meta?: VideoMeta;
  downloadResult?: VideoDownloadResult;
  picturesDir?: string;
  models?: Model[];
  tags?: Tag[];
  status: VideoStatus;
  sha512?: string;
  sha512Stream?: string;
};

@Service()
export class VideoRepository {
  @Inject(() => DataSource)
  private readonly db!: DataSource;

  protected get repository() {
    return this.db.getRepository(Video);
  }

  async getVideoByHashId(hashId: string) {
    return this.repository.findOne({ where: { hashId } });
  }

  async createVideo({ videoUrl, meta, status, downloadResult, picturesDir, tags = [], models = [] }: VideoData) {
    const video = new Video();
    video.hashId = videoUrl.hashId;
    video.title = videoUrl.title;
    video.url = videoUrl.href;
    video.img = videoUrl.img;

    if (meta) {
      video.downloadUrl = meta.downloadUrl;
      video.streamUrl = meta.streamUrl;
      video.releaseDate = meta.addDate;
      video.rating = meta.rating;
      video.picturesUrl = meta.picturesUrl;
    }

    if (picturesDir) {
      video.picturesDir = picturesDir;
    }

    video.status = status;

    video.models = models;
    video.tags = tags;

    if (downloadResult) {
      video.fileName = downloadResult.fileName;
      video.fileSize = downloadResult.fileSize;
      video.filePath = downloadResult.filePath;
    }

    return this.repository.save(video);
  }

  async updateVideo(video: Video, data: Partial<VideoData>) {
    if (data.meta) {
      video.downloadUrl = data.meta.downloadUrl;
      video.streamUrl = data.meta.streamUrl;
      video.releaseDate = data.meta.addDate;
      video.rating = data.meta.rating;
      video.picturesUrl = data.meta.picturesUrl;
    }

    if (data.downloadResult) {
      video.fileName = data.downloadResult.fileName;
      video.fileSize = data.downloadResult.fileSize;
      video.filePath = data.downloadResult.filePath;
    }

    if (data.models) {
      video.models = data.models;
    }

    if (data.tags) {
      video.tags = data.tags;
    }

    if (data.picturesDir) {
      video.picturesDir = data.picturesDir;
    }

    if (data.status) {
      video.status = data.status;
    }

    if (data.sha512) {
      video.sha512 = data.sha512;
    }

    if (data.sha512Stream) {
      video.sha512Stream = data.sha512Stream;
    }

    return this.repository.save(video);
  }
}
