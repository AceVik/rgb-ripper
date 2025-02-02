import { spawn } from 'node:child_process';
import { Service } from 'typedi';

@Service()
export class FfmpegService {
  /**
   * Führt FFmpeg aus, um .ts-Datei in .mp4 zu muxen (copy codecs).
   */
  async convertTsToMp4(tsFile: string, mp4File: string) {
    return new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-hide_banner',
        '-y', // überschreiben
        '-i',
        tsFile,
        '-c:v',
        'copy',
        '-c:a',
        'copy',
        mp4File,
      ]);

      ffmpeg.stdout.on('data', (data) => {
        process.stdout.write(`\r` + data.toString().trim());
      });

      ffmpeg.stderr.on('data', (data) => {
        process.stdout.write(`\r` + data.toString().trim());
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  }
}
