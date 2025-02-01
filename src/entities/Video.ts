import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryColumn } from 'typeorm';
import { Model } from '@/entities/Model';
import { Tag } from '@/entities/Tag';

@Entity('videos')
export class Video {
  @PrimaryColumn({ type: 'varchar', length: 265 })
  hashId!: string;

  @Column({ type: 'varchar', length: 265 })
  title!: string;

  @Column({ type: 'varchar', length: 1024 })
  url!: string;

  @Column({ type: 'varchar', length: 1024 })
  downloadUrl!: string;

  @Column({ type: 'varchar', length: 256 })
  fileName!: string;

  @Column({ type: 'bigint', unsigned: true })
  fileSize!: number;

  @Column({ type: 'varchar', length: 1024 })
  filePath!: string;

  @Column({ type: 'varchar', length: 1024 })
  img!: string;

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
