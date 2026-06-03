/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Google's sign-in popup flow polls `popup.closed` to detect when the user
// finishes. GitHub Pages can't set HTTP headers, and without
// `Cross-Origin-Opener-Policy: same-origin-allow-popups` Chrome blocks that
// read against Google's cross-origin popup, returning `true` — so GIS thinks
// the popup was closed and aborts with `popup_closed`. We inject the header
// onto navigation responses here (the only place we can on static hosting).
// This listener is registered before precacheAndRoute so it claims navigation
// requests first.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    (async () => {
      let response: Response
      try {
        response = await fetch(event.request)
      } catch {
        // Offline fallback: serve the cached app shell if the network is down.
        const cached = await caches.match(event.request)
        if (cached) return cached
        throw new Error('offline and no cached navigation response')
      }
      const headers = new Headers(response.headers)
      headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    })()
  )
})

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
