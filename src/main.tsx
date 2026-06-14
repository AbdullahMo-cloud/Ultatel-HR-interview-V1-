// Ensure window.fetch has both a getter and a setter to prevent "TypeError: Cannot set property fetch of #<Window> which has only a getter"
try {
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    let currentFetch = originalFetch;

    const descriptor = {
      get() {
        return currentFetch;
      },
      set(val: any) {
        currentFetch = val;
      },
      configurable: true,
      enumerable: true
    };

    // Try defining on window itself
    let success = false;
    try {
      Object.defineProperty(window, 'fetch', descriptor);
      success = true;
    } catch (e) {
      console.warn("Could not define fetch on window directly, trying prototype:", e);
    }

    // Try defining on Window prototype if direct define failed or just to be safe
    if (!success) {
      try {
        const proto = Object.getPrototypeOf(window);
        if (proto) {
          Object.defineProperty(proto, 'fetch', descriptor);
        }
      } catch (protoErr) {
        console.warn("Could not define fetch on prototype:", protoErr);
      }
    }

    // Define on self
    if (typeof self !== 'undefined') {
      try {
        Object.defineProperty(self, 'fetch', descriptor);
      } catch (e) {
        console.warn("Could not define fetch on self:", e);
      }
    }

    // Define on globalThis
    if (typeof globalThis !== 'undefined') {
      try {
        Object.defineProperty(globalThis, 'fetch', descriptor);
      } catch (e) {
        console.warn("Could not define fetch on globalThis:", e);
      }
    }
  }
} catch (globalErr) {
  console.warn("Global fetch wrapper installation failed:", globalErr);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
