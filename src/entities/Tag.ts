import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('tags')
export class Tag {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  hashId!: string;

  @Column({ type: 'varchar', length: 265 })
  name!: string;

  @Column({ type: 'varchar', length: 1024 })
  href!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
