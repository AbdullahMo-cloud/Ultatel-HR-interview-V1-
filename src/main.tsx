// Ensure window.fetch has a configurable getter and a setter to prevent fetch assignment errors in Sandbox environments
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    let currentFetch = originalFetch;
    const descriptor = {
      get() { return currentFetch; },
      set(val: any) { currentFetch = val; },
      configurable: true,
      enumerable: true
    };
    try {
      Object.defineProperty(window, 'fetch', descriptor);
    } catch (e) {
      // Ignored if non-configurable or already configured by early script
    }
  }
} catch (globalErr) {
  console.warn("Global fetch preparation failed:", globalErr);
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
