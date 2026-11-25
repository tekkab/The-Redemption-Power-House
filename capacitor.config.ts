import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.redemptionpowerhouse.app',
  appName: 'The Redemption Power House',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#102b67',
  android: {
    allowMixedContent: false,
  },
};

export default config;
