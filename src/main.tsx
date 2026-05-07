import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Default: light mode (nhớ preference sau refresh)
const theme = localStorage.getItem('sheki-theme') ?? 'light'
document.documentElement.classList.add(theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
