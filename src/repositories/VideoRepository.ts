import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Video } from '@/entities';

@Service()
export class VideoRepository {
  @Inject(() => DataSource)
  private readonly db!: DataSource;

  protected get repository() {
    return this.db.getRepository(Video);
  }

  async getLastStoredVideo() {
    if ((await this.repository.count()) === 0) {
      return null;
    }

    return this.repository.findOne({ order: { createdAt: 'DESC' } });
  }
}
