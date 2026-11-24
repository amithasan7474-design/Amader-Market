/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-b1bafff1'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "a4e0568d146813369c3da821e44b548f"
  }, {
    "url": "pwa-512x512.png",
    "revision": "83e833f3def48abfd46e8d126e6016bc"
  }, {
    "url": "pwa-192x192.png",
    "revision": "1831f6a27827b3ea7b18a93bce2b575a"
  }, {
    "url": "index.html",
    "revision": "300665ccc46946e9eba69dc001155b0e"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "440924173df647325de4c4f2924e46c4"
  }, {
    "url": "app-logo.png",
    "revision": "1f33a2f15576598b5e78073462dded9d"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-B1EYqJGn.js",
    "revision": null
  }, {
    "url": "assets/index--K0kcL6J.css",
    "revision": null
  }, {
    "url": "assets/aistudio/file_00000000143471fa90c6898a22902f8f_1273da1a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261123_174709_c662a6f0.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261123_140315_4cd13b9e.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261123_080648_a80659a7.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261123_075111_76d57922.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261122_213419_428b759e.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261122_213138_c3281e5b.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261122_213128_98f6ec3f.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261122_210221_f0306c2a.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261122_205942_267be099.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261122_084627_75352575.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261121_212604_c92fe4e4.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261121_203518_194ac6d9.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261121_203346_1bc1a9d0.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261121_180839_345d320b.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261121_175319_50dc8e47.jpg",
    "revision": null
  }, {
    "url": "app-logo.png",
    "revision": "1f33a2f15576598b5e78073462dded9d"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "440924173df647325de4c4f2924e46c4"
  }, {
    "url": "pwa-192x192.png",
    "revision": "1831f6a27827b3ea7b18a93bce2b575a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "83e833f3def48abfd46e8d126e6016bc"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "a4e0568d146813369c3da821e44b548f"
  }, {
    "url": "manifest.webmanifest",
    "revision": "85898e1802d589f5e3c5594b3eb63eb9"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    request
  }) => request.destination === "image", new workbox.StaleWhileRevalidate({
    "cacheName": "amader-product-images",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 350,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
