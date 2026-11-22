import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { fetchBrandingSettings } from './lib/brandingStore.ts';

fetchBrandingSettings();

createRoot(document.getElementById('root')!).render(<App />);
