import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
const look = new URLSearchParams(window.location.search).get('look');
if (look === 'stage') {
  root.style.cssText = 'position:fixed;inset:0';
  import('./world3d/lookStage').then((m) => m.mountLookStage(root));
} else if (look === 'splat') {
  root.style.cssText = 'position:fixed;inset:0';
  import('./world3d/lookTest').then((m) => m.mountLookTest(root));
} else if (look === 'hex') {
  root.style.cssText = 'position:fixed;inset:0';
  import('./ui/hex/lookHex').then((m) => m.mountLookHex(root));
} else if (look === 'minigame') {
  root.style.cssText = 'position:fixed;inset:0';
  import('./ui/minigames/lookMini').then((m) => m.mountLookMini(root));
} else if (look === 'yearend' || look === 'ending') {
  root.style.cssText = 'position:fixed;inset:0';
  import('./world3d/cutscene/lookCutscene').then((m) => m.mountLookCutscene(root, look));
} else if (look === 'world') {
  root.style.cssText = 'position:fixed;inset:0';
  import('./world3d/lookWorld').then((m) => m.mountLookWorld(root));
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
