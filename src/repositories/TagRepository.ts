import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Tag } from '@/entities';
import { TagUrl } from '@/services';

@Service()
export class TagRepository {
  @Inject(() => DataSource)
  private readonly db!: DataSource;

  protected get repository() {
    return this.db.getRepository(Tag);
  }

  async getTagById(hashId: string) {
    return this.repository.findOne({ where: { hashId } });
  }

  async createTag(tag: TagUrl) {
    const newTag = new Tag();
    newTag.hashId = tag.hashId;
    newTag.name = tag.name;
    newTag.href = tag.href;

    return this.repository.save(newTag);
  }
}
