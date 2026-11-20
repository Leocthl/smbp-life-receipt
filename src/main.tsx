import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
const look = new URLSearchParams(window.location.search).get('look');
if (look === 'splat') {
  root.style.cssText = 'position:fixed;inset:0';
  import('./world3d/lookTest').then((m) => m.mountLookTest(root));
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
