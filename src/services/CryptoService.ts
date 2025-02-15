import { createHash } from 'crypto';
import { createSHA512 } from 'hash-wasm';
import { Service } from 'typedi';
import { createReadStream } from 'fs';

@Service()
export class CryptoService {
  md5(data: string): string {
    return createHash('md5').update(data).digest('hex');
  }

  /**
   * Computes the SHA512 hash of a file using a streaming approach.
   */
  async hashFile(filePath: string): Promise<string> {
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
      stream.on('error', (err) => reject(err));
    });
  }
}
