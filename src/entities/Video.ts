import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryColumn } from 'typeorm';
import { Model } from '@/entities/Model';
import { Tag } from '@/entities/Tag';

export const videoStatus = ['todo', 'to-download-stream', 'to-download-video', 'ready', 'error'] as const;
export type VideoStatus = (typeof videoStatus)[number];

@Entity('videos')
export class Video {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  hashId!: string;

  @Column({ type: 'varchar', length: 265 })
  title!: string;

  @Column({ type: 'varchar', length: 1024 })
  url!: string;

  @Column({ type: 'varchar', length: 1024 })
  downloadUrl!: string;

  @Column({ type: 'varchar', length: 1024 })
  streamUrl!: string;

  @Column({ type: 'varchar', length: 256 })
  fileName!: string;

  @Column({ type: 'bigint', unsigned: true })
  fileSize!: number;

  @Column({ type: 'varchar', length: 1024 })
  filePath!: string;

  @Column({ type: 'varchar', length: 1024 })
  img!: string;

  @Column({ type: 'varchar', length: 1024 })
  picturesUrl!: string;

  @Column({ type: 'varchar', length: 1024 })
  picturesDir!: string;

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
}
