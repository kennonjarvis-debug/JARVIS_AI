'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 *
 * Registers the service worker for PWA functionality on client-side only.
 * This component should be included in the root layout.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silently fail - service worker is optional
      });
    }
  }, []);

  return null;
}
