import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_URL = "https://stocknews.orangecloud.vn";

const config: CapacitorConfig = {
  appId: "vn.orangecloud.stocknews",
  appName: "Stock News",
  webDir: "www",
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
      "stocknews.orangecloud.vn",
      "*.orangecloud.vn",
      "t.me",
      "telegram.me",
      "cafef.vn",
      "vietstock.vn",
      "hsx.vn"
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a"
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true
  }
};

export default config;
