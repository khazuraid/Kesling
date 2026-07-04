/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, type PrecacheEntry, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Never cache API routes - always go to network
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      method: "GET",
      handler: new NetworkOnly(),
    },
    // Use default cache for everything else
    ...defaultCache,
  ],
  fallbacks: { entries: [{ url: "/offline.html", matcher: ({ request }) => request.destination === "document" }] },
});

serwist.addEventListeners();
