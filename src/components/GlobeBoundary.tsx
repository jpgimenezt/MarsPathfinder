import { Component, type ReactNode } from 'react'
import { savedLanguage } from '../features/i18n/appI18n'

interface Props {
  children: ReactNode
  onJezero: () => void
}

export class GlobeBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return <div className="globe-fallback" role="alert">
      {savedLanguage(typeof window === 'undefined' ? null : window.localStorage) === 'en'
        ? 'The 3D view is unavailable. The scientific 2D map remains accessible.'
        : 'La vista 3D no está disponible. El mapa científico 2D sigue funcionando.'}
      <button type="button" onClick={this.props.onJezero}>{savedLanguage(typeof window === 'undefined' ? null : window.localStorage) === 'en' ? 'Explore Jezero in 2D' : 'Explorar Jezero en 2D'}</button>
    </div>
    return this.props.children
  }
}
