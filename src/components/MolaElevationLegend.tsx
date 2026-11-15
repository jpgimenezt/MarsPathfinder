import { MOLA_LEGEND_URL, MOLA_LOOKUP_URL, molaGradient } from '../features/globe/molaPalette'

export function MolaElevationLegend() {
  return <details className="mola-legend">
    <summary>Referencias de elevación</summary>
    <div className="mola-legend-content">
      <p>Paleta MOLA de referencia · intervalos de 1 km respecto del <b>areoide marciano</b>.</p>
      <div className="mola-scale" role="img"
        aria-label="Escala orientativa de colores: violeta y azul a elevaciones bajas; verde y amarillo intermedias; naranja, marrón y tonos claros más altas."
        style={{ backgroundImage: molaGradient }} />
      <div className="mola-ticks" aria-label="Referencias aproximadas en kilómetros">
        <span>−9</span><span>0</span><span>+10</span><span>+21</span>
      </div>
      <p className="mola-legend-note">Escala ilustrativa de la tabla USGS (−9 a +21 km); extremos cartográficos aproximados: −8,2 a +21,2 km.
        El sombreado y la reducción JPEG alteran el color: <b>no permite deducir una cota precisa de un píxel</b>.
        El azul no es agua; los colores no son naturales.</p>
      <a href={MOLA_LEGEND_URL} target="_blank" rel="noreferrer">Leyenda oficial ↗</a>
      {' · '}
      <a href={MOLA_LOOKUP_URL} target="_blank" rel="noreferrer">Tabla RGB USGS ↗</a>
    </div>
  </details>
}
