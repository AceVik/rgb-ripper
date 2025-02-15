import process from 'node:process';
import { Service } from 'typedi';
import { load as loadDOM } from 'cheerio';
import { BASE_URL, webClient } from '@/utils';

@Service()
export class WebService {
  async login() {
    const username = process.env.USERNAME?.trim();
    const password = process.env.PASSWORD?.trim();

    if (!username?.length || !password?.length) {
      console.error('Username or password not set. Check your .env vars. Exiting.');
      process.exit(1);
    }

    console.info('Logging in...');
    await webClient.get('/members');
    const params = new URLSearchParams({
      rlm: 'Welcome Members',
      for: encodeURIComponent(`${BASE_URL}/members/`),
      uid: username,
      pwd: password,
      rmb: 'y',
      Submit: 'MEMBER LOGIN',
    });

    const postResponse = await webClient.post('/auth.form', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return postResponse.status >= 200 && postResponse.status < 300;
  }

  async getVideosPage(page: number) {
    const getFirstPage = await webClient.get('/members/categories/movies/' + page + '/latest/');
    return loadDOM(getFirstPage.data);
  }

  async getVideoPage(url: string) {
    const getVideoPage = await webClient.get(url);
    return loadDOM(getVideoPage.data);
  }

  async getVideoStream(url: string) {
    return webClient.get(url, { responseType: 'stream' });
  }

  async getModelPage(url: string) {
    const getModelPage = await webClient.get(url);
    return loadDOM(getModelPage.data);
  }

  async getModelPicture(url: string) {
    return webClient.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  }

  async getAsText(url: string) {
    return webClient.get<string>(url, { responseType: 'text' });
  }

  async getAsArrayBuffer(url: string) {
    return webClient.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  }
}
