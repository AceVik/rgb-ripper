import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Model } from '@/entities/Model';
import { Tag } from '@/entities/Tag';

export const videoStatus = ['todo', 'to-download-stream', 'to-download-video', 'ready', 'error'] as const;
export type VideoStatus = (typeof videoStatus)[number];

@Entity('videos')
export class Video {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  hashId!: string;

  @Column({ type: 'char', length: 128, nullable: true, default: null })
  sha512!: string;

  @Column({ type: 'char', length: 128, nullable: true, default: null })
  sha512Stream!: string;

  @Column({ type: 'varchar', length: 265 })
  title!: string;

  @Column({ type: 'varchar', length: 1024 })
  url!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true, default: null })
  downloadUrl: string | null = null;

  @Column({ type: 'varchar', length: 1024, nullable: true, default: null })
  streamUrl: string | null = null;

  @Column({ type: 'varchar', length: 256, nullable: true, default: null })
  fileName: string | null = null;

  @Column({ type: 'bigint', unsigned: true, nullable: true, default: null })
  fileSize: number | null = null;

  @Column({ type: 'varchar', length: 1024, nullable: true, default: null })
  filePath: string | null = null;

  get streamFilePath(): string | null {
    if (!this.filePath?.length) {
      return null;
    }

    if (this.filePath!.lastIndexOf('.stm.') >= 0) {
      return this.filePath;
    }

    return this.filePath!.replace('.mp4', '.stm.mp4');
  }

  @Column({ type: 'varchar', length: 1024 })
  img!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true, default: null })
  picturesUrl: string | null = null;

  @Column({ type: 'varchar', length: 1024, nullable: true, default: null })
  picturesDir: string | null = null;

  @Column({ type: 'varchar', length: 32 })
  status!: VideoStatus;

  @ManyToMany(() => Model, (model) => model.videos)
  @JoinTable({
    name: 'videos2models',
    joinColumn: { name: 'videoHashId', referencedColumnName: 'hashId' },
    inverseJoinColumn: { name: 'modelHashId', referencedColumnName: 'hashId' },
  })
  models!: Model[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'videos2tags',
    joinColumn: { name: 'videoHashId', referencedColumnName: 'hashId' },
    inverseJoinColumn: { name: 'tagHashId', referencedColumnName: 'hashId' },
  })
  tags!: Tag[];

  @Column({ type: 'date', nullable: true, default: null })
  releaseDate?: Date;

  @Column({ type: 'float', unsigned: true, nullable: true, default: null })
  rating?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
