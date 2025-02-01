import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Video } from '@/entities/Video';

@Entity('models')
export class Model {
  @PrimaryColumn({ type: 'varchar', length: 265 })
  hashId!: string;

  @Column({ type: 'varchar', length: 265 })
  name!: string;

  @Column({ type: 'varchar', length: 1024 })
  href!: string;

  @Column({ type: 'text', nullable: true, default: null })
  aboutText!: string;

  @Column({ type: 'text', nullable: true, default: null })
  statsText!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true, default: null })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true, default: null })
  imagePath?: string | null;

  @ManyToMany(() => Video, (video) => video.models)
  @JoinTable({
    name: 'videos2models',
    joinColumn: { name: 'videoHashId', referencedColumnName: 'hashId' },
    inverseJoinColumn: { name: 'modelHashId', referencedColumnName: 'hashId' },
  })
  videos!: Video[];

  @CreateDateColumn()
  createdAt!: Date;
}
