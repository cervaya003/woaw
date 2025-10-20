import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.helscode.woaw',
  appName: 'woaw',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: "native", 
      resizeOnFullScreen: true,  
    }
  }
};

export default config;
