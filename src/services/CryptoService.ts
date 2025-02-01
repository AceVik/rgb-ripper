import { createHash } from 'crypto';
import { Service } from 'typedi';

@Service()
export class CryptoService {
  sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
