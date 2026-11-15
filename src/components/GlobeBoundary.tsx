import { Component, type ReactNode } from 'react'

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
      La vista 3D no está disponible. El mapa científico 2D sigue funcionando.
      <button type="button" onClick={this.props.onJezero}>Explorar Jezero en 2D</button>
    </div>
    return this.props.children
  }
}
