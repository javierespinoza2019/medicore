import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedFirmaEjemplo } from './utils/firmaEjemplo'

// Precarga la firma de ejemplo del Dr. Alejandro García Mendoza (d1)
// para que la funcionalidad de e.firma sea visible sin configuración previa
seedFirmaEjemplo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)