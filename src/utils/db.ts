import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Container } from 'typedi';
import { rootDir } from '@/paths';

export const db = new DataSource({
  type: 'mariadb',
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  username: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'your_database',
  synchronize: process.env.NODE_ENV === 'development',
  logging: false,
  entities: [rootDir + '/src/entities/**/*.ts'],
  migrations: [],
  subscribers: [],
});

Container.set<DataSource>(DataSource, db);
