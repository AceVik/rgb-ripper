import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as process from 'node:process';

export const BASE_URL = process.env.BASE_URL?.trim();

if (!BASE_URL?.length) {
  console.error('BASE_URL is not set. Check your .env vars. Exiting.');
  process.exit(1);
}

const jar = new CookieJar();
export const webClient = wrapper(
  axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    jar,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    },
  }),
);
