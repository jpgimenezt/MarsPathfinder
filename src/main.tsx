import { createRoot } from 'react-dom/client'
import 'ol/ol.css'
import './styles/app.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(<App />)
