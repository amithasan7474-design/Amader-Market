import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.isbest.amadermarket',
  appName: 'Amader Market',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.firebaseio.com', '*.googleapis.com', '*.firebaseapp.com'],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
