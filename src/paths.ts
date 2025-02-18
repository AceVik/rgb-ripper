import * as path from 'node:path';
import * as process from 'node:process';
import * as fs from 'node:fs';

export const rootDir = path.resolve(__dirname, '..');
export const filesDir = process.env.FILES_DIR || path.resolve(rootDir, 'files');
export const imagesDir = path.resolve(filesDir, 'images');
export const videosDir = path.resolve(filesDir, 'videos');
export const dbPath = path.resolve(filesDir, 'db.sqlite');

export const initDirs = async () => {
  for (const dir of [filesDir, imagesDir, videosDir]) {
    fs.mkdir(dir, { recursive: true }, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
};
