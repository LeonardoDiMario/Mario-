import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './AppBootstrap.tsx';
import './characterAvatarFallback';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
