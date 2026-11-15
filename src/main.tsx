import { createRoot } from 'react-dom/client'
import 'ol/ol.css'
import './styles/app.css'
import { App } from './app/App'
import { LanguageProvider } from './features/i18n/appI18n'

createRoot(document.getElementById('root')!).render(<LanguageProvider><App /></LanguageProvider>)
