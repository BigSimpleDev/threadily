import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigsimple.threadily',
  appName: 'Threadily',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
