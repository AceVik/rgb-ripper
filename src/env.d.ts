declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';

    FILES_DIR?: string;

    BASE_URL: string;
    USERNAME: string;
    PASSWORD: string;
  }
}
