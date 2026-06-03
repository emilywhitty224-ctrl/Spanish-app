/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Google's sign-in popup flow polls `popup.closed` and uses postMessage to
// return the token. Modern Chrome severs the opener<->popup channel for
// cross-origin popups unless both sides opt into COOP `restrict-properties`,
// which Google's accounts pages use; without it Chrome blocks the
// `.closed` read, so GIS thinks the popup was closed and aborts with
// `popup_closed`. GitHub Pages can't set HTTP headers and COOP can't be set
// via <meta>, so we inject it onto navigation responses here (the only place
// we can on static hosting). Registered before precacheAndRoute so it claims
// navigation requests first.
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
      headers.set('Cross-Origin-Opener-Policy', 'restrict-properties')
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
