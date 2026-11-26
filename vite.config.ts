import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'app-logo.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Amader Market',
          short_name: 'AmaderMarket',
          description: 'Fast, offline-capable shopping & marketplace control app for Amader Market.',
          theme_color: '#043934',
          background_color: '#032629',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({request}) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'amader-product-images',
                expiration: {
                  maxEntries: 350,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      // Copies src/assets into dist/ so root-relative URLs still resolve
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      {
        name: 'serve-built-apk',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const urlPath = (req.url || '').split('?')[0];
            if (
              urlPath === '/app-debug.apk' ||
              urlPath === '/APK_DOWNLOAD/app-debug.apk' ||
              urlPath === '/.build-outputs/app-debug.apk'
            ) {
              const apkPath = path.resolve(__dirname, 'APK_DOWNLOAD/app-debug.apk');
              if (fs.existsSync(apkPath)) {
                const stat = fs.statSync(apkPath);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                res.setHeader(
                  'Content-Disposition',
                  'attachment; filename="Amader-Market-v2.0.2-debug.apk"',
                );
                res.setHeader('Content-Length', String(stat.size));
                res.setHeader('Cache-Control', 'no-store');
                fs.createReadStream(apkPath).pipe(res);
                return;
              }
            }
            if (urlPath === '/github-source.zip') {
              try {
                const zipBuf = execFileSync('git', ['archive', '--format=zip', 'HEAD'], {
                  cwd: __dirname,
                  maxBuffer: 50 * 1024 * 1024,
                });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader(
                  'Content-Disposition',
                  'attachment; filename="amader-market-github-source.zip"',
                );
                res.setHeader('Content-Length', String(zipBuf.length));
                res.setHeader('Cache-Control', 'no-store');
                res.end(zipBuf);
                return;
              } catch {
                // fallback to next if git archive fails
              }
            }
            next();
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            const urlPath = (req.url || '').split('?')[0];
            if (
              urlPath === '/app-debug.apk' ||
              urlPath === '/APK_DOWNLOAD/app-debug.apk' ||
              urlPath === '/.build-outputs/app-debug.apk'
            ) {
              const apkPath = path.resolve(__dirname, 'APK_DOWNLOAD/app-debug.apk');
              if (fs.existsSync(apkPath)) {
                const stat = fs.statSync(apkPath);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                res.setHeader(
                  'Content-Disposition',
                  'attachment; filename="Amader-Market-v2.0.2-debug.apk"',
                );
                res.setHeader('Content-Length', String(stat.size));
                res.setHeader('Cache-Control', 'no-store');
                fs.createReadStream(apkPath).pipe(res);
                return;
              }
            }
            if (urlPath === '/github-source.zip') {
              try {
                const zipBuf = execFileSync('git', ['archive', '--format=zip', 'HEAD'], {
                  cwd: __dirname,
                  maxBuffer: 50 * 1024 * 1024,
                });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader(
                  'Content-Disposition',
                  'attachment; filename="amader-market-github-source.zip"',
                );
                res.setHeader('Content-Length', String(zipBuf.length));
                res.setHeader('Cache-Control', 'no-store');
                res.end(zipBuf);
                return;
              } catch {
                // fallback to next if git archive fails
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
