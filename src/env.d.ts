declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';

    BASE_URL: string;
    USERNAME: string;
    PASSWORD: string;
    FILES_PATH: string;
  }
}
