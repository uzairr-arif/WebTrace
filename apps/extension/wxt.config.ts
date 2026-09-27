import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'WebTrace — Web Request Flow Explorer',
    short_name: 'WebTrace',
    description:
      'See how the web actually works. WebTrace turns browser network activity into an interactive, explainable flow — local and private.',
    version: '0.1.0',
    permissions: ['webRequest', 'webNavigation', 'storage', 'tabs', 'sidePanel'],
    host_permissions: ['<all_urls>'],
    minimum_chrome_version: '116',
    icons: {
      16: '/icon/icon-16.png',
      32: '/icon/icon-32.png',
      48: '/icon/icon-48.png',
      128: '/icon/icon-128.png',
    },
    action: {
      default_title: 'WebTrace — Live Flow',
      default_icon: {
        16: '/icon/icon-16.png',
        32: '/icon/icon-32.png',
        48: '/icon/icon-48.png',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
