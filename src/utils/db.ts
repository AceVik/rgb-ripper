import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dbPath } from '@/paths';
import * as entities from '@/entities';
import { Container } from 'typedi';

export const db = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: true,
  logging: false,
  entities: Object.values(entities),
  migrations: [],
  subscribers: [],
});

Container.set<DataSource>(DataSource, db);
