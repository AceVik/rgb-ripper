import * as fs from 'node:fs';
import * as path from 'node:path';
import { Inject, Service } from 'typedi';
import { ModelUrl } from '@/services/VideoService';
import { ModelRepository } from '@/repositories';
import { WebService } from '@/services/WebService';
import { filesDir, imagesDir } from '@/paths';

export type ModelMeta = {
  about: string;
  stats: string;
  imageUrl: string;
};

@Service()
export class ModelService {
  @Inject(() => ModelRepository)
  private readonly modelRepository!: ModelRepository;

  @Inject(() => WebService)
  private readonly webService!: WebService;

  async getModelMeta(model: ModelUrl): Promise<ModelMeta> {
    const $ = await this.webService.getModelPage(model.href);
    const aboutText = $('.profileDetails .aboutmodel > p').text().trim();
    const statsText = $('.profileDetails .stats > p').text().trim();
    const profileImageEm = $('.profile .profileimg img');

    return {
      about: aboutText,
      stats: statsText,
      imageUrl: profileImageEm.attr('src0_1x') || profileImageEm.attr('src')!,
    };
  }

  async createModelIfNotExists(model: ModelUrl) {
    const existingModel = await this.modelRepository.getModelById(model.hashId);
    if (existingModel) {
      return existingModel;
    }

    const meta = await this.getModelMeta(model);

    let imagePath = null;
    if (meta.imageUrl) {
      const image = await this.webService.getModelPicture(meta.imageUrl);
      imagePath = path.join(imagesDir, `${model.hashId}_${model.name}.jpg`);
      fs.writeFileSync(imagePath, Buffer.from(image.data));
    }

    console.info(`Creating model ${model.name}`);
    try {
      const newModel = await this.modelRepository.createModel(model, meta, imagePath ? path.relative(filesDir, imagePath) : null);
      return newModel;
    } catch (err) {
      if (!!imagePath?.length) fs.unlinkSync(imagePath);
      throw err;
    }
  }
}
