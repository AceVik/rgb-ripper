import { createHash } from 'crypto';
import { createSHA512 } from 'hash-wasm';
import { Service } from 'typedi';
import { createReadStream } from 'fs';
import { runCmdAsync } from '@/utils';

@Service()
export class CryptoService {
  md5(data: string): string {
    return createHash('md5').update(data).digest('hex');
  }

  async nativeHashFile(filePath: string): Promise<string> {
    const hasher = await createSHA512();
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hasher.update(chunk));
      stream.on('end', async () => {
        try {
          const hash = await hasher.digest('hex');
          resolve(hash);
        } catch (error) {
          reject(error);
        }
      });
      stream.on('error', (err) => {
        console.error(err);
        reject(err);
      });
    });
  }

  async bashHashFile(filePath: string): Promise<string> {
    const rsp = await runCmdAsync('sha512sum', [filePath]);
    return rsp.stdout.split(' ')[0];
  }

  /**
   * Computes the SHA512 hash of a file using a streaming approach.
   */
  async hashFile(filePath: string): Promise<string> {
    try {
      return this.nativeHashFile(filePath);
    } catch {
      return this.bashHashFile(filePath);
    }
  }
}
