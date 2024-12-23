import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  // todo: use strict mode
  // <StrictMode>
  //   <App />
  // </StrictMode>,
  <App />,
);
