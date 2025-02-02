import { Inject, Service } from 'typedi';
import { WebService, CryptoService } from '@/services';
import { VideoData, VideoRepository } from '@/repositories';
import { jsLiteralToJSON } from '@/utils';
import { Model, Tag, Video } from '@/entities';

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
  downloadUrl: string;
  streamUrl: string;
  picturesUrl: string;
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
          hashId: this.cryptoService.md5(href),
          title: hrefEm.attr('title')!,
          href,
          img: imgEm.attr('src0_1x') || imgEm.attr('src')!,
        } satisfies VideoUrl;
      })
      .get<VideoUrl>();
  }

  async getVideoUrls() {
    const videoUrls: VideoUrl[] = [];
    let page = 1;
    let hasMore = true;
    do {
      console.info(`Getting video urls for page ${page}`);
      const urls = await this.getVideoUrlsForPage(page);
      hasMore = urls.length > 0;

      if (!hasMore) {
        console.info('No more videos found');
      } else {
        videoUrls.push(...urls);
        page++;
      }
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
          hashId: this.cryptoService.md5(href),
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
          hashId: this.cryptoService.md5(href),
          name: $el.text().trim(),
          href,
        } satisfies TagUrl;
      })
      .get<TagUrl>();

    const scriptEm = $('#download_form + script');
    const rx = /.+?movie\["fullmp4"\]\[".+?"\] .*?=.*? ({.+?})/s;
    const mt = scriptEm.text().match(rx);

    const rx2 = /df_movie\[.+?=.+?({.+?})/s;
    const mt2 = scriptEm.text().match(rx2);

    const videoPath = mt ? JSON.parse(jsLiteralToJSON(mt[1])).path : null;
    const videoStreamPath = mt2 ? JSON.parse(jsLiteralToJSON(mt2[1])).path : null;

    const picturesPath = $('.subnav .content_tab_wrapper li:nth-child(2) a').attr('href')!;

    return {
      title,
      rating,
      addDate: new Date(addDate),
      models,
      tags,
      downloadUrl: videoPath,
      streamUrl: videoStreamPath,
      picturesUrl: picturesPath,
    };
  }

  async getVideoPictureUrls(videoPicturesUrl: string): Promise<string[]> {
    const pageTextRes = await this.webService.getAsText(videoPicturesUrl);
    const rx = /ptx\["jpg"\] = {};\s+(.+?)\s+togglestatus = true;/s;
    const mt = pageTextRes.data.match(rx);

    if (!mt) {
      throw new Error('No pictures found');
    }

    return mt[1].split('\n').map((line) => {
      return JSON.parse(jsLiteralToJSON(line.substring(line.indexOf('{'), line.lastIndexOf('}') + 1).trim())).src;
    });
  }

  async createVideoIfNotExists(videoUrl: VideoUrl) {
    const video = await this.videoRepository.getVideoByHashId(videoUrl.hashId);
    if (video) {
      return video;
    }

    return this.videoRepository.createVideo({
      videoUrl,
      status: 'todo',
    });
  }

  async updateVideo(video: Video, data: Partial<VideoData>) {
    return this.videoRepository.updateVideo(video, data);
  }
}
