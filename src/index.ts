import 'reflect-metadata';
import 'dotenv/config';
import { Container } from 'typedi';
import { initDirs } from '@/paths';
import { db } from '@/utils';
import { Main } from '@/main';

// Initialize the database and run the main service (elevate)
(async () => {
  console.info('Initializing...');
  await initDirs();
  await db.initialize();
  const main = Container.get(Main);
  await main.run();
})().catch(console.error);
