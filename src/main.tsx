import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// import '@fontsource/inter';
import React from 'react';
import { CircularProgress } from '@mui/joy';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <React.StrictMode>
      <Suspense fallback={<CircularProgress />}>
        <App />
      </Suspense>
    </React.StrictMode>
  </StrictMode>,
)
