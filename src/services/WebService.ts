import process from 'node:process';
import { Service } from 'typedi';
import { load as loadDOM } from 'cheerio';
import { webClient } from '@/utils';

@Service()
export class WebService {
  async login() {
    console.info('Logging in...');
    await webClient.get('/members');
    const params = new URLSearchParams({
      rlm: 'Welcome Members',
      for: 'https%3a%2f%2fwww%2erealgangbangs%2ecom%2fmembers%2f',
      uid: process.env.USERNAME,
      pwd: process.env.PASSWORD,
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
}
