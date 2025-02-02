import { createHash } from 'crypto';
import { Service } from 'typedi';

@Service()
export class CryptoService {
  md5(data: string): string {
    return createHash('md5').update(data).digest('hex');
  }
}
