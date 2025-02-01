import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Model } from '@/entities';
import { ModelMeta, ModelUrl } from '@/services';

@Service()
export class ModelRepository {
  @Inject(() => DataSource)
  private readonly db!: DataSource;

  protected get repository() {
    return this.db.getRepository(Model);
  }

  async getModelById(hashId: string) {
    return this.repository.findOne({ where: { hashId } });
  }

  async createModel(model: ModelUrl, meta: ModelMeta, imagePath: string | null) {
    const newModel = new Model();
    newModel.hashId = model.hashId;
    newModel.name = model.name;
    newModel.href = model.href;
    newModel.aboutText = meta.about;
    newModel.statsText = meta.stats;
    newModel.imageUrl = meta.imageUrl;
    newModel.imagePath = imagePath;

    return this.repository.save(newModel);
  }
}
