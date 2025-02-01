import { Inject, Service } from 'typedi';
import { TagUrl } from '@/services/VideoService';
import { TagRepository } from '@/repositories';

@Service()
export class TagService {
  @Inject(() => TagRepository)
  private readonly tagRepository!: TagRepository;

  async createTagIfNotExists(tag: TagUrl) {
    const realTag = await this.tagRepository.getTagById(tag.hashId);
    if (realTag) {
      return realTag;
    }

    return this.tagRepository.createTag(tag);
  }
}
