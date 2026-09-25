
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
// Local-first PWA: a precache service worker (VitePWA autoUpdate) owns the app shell so the app
// opens instantly and works fully offline. Do NOT wipe service workers / CacheStorage here — that
// would destroy the offline shell on every boot. Business data still lives in local SQLite + the
// Supabase sync layer (the SW only caches static assets, never DB data).

createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <App />
  </BrowserRouter>
);
