import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as process from 'node:process';

const jar = new CookieJar();
export const webClient = wrapper(
  axios.create({
    baseURL: process.env.BASE_URL,
    withCredentials: true,
    jar,
  }),
);
