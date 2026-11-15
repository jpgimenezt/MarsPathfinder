import { MOLA_LEGEND_URL, MOLA_LOOKUP_URL, molaGradient } from '../features/globe/molaPalette'
import { useLanguage } from '../features/i18n/appI18n'

export function MolaElevationLegend() {
  const { language } = useLanguage()
  const ui = (en: string, es: string) => language === 'en' ? en : es
  return <details className="mola-legend">
    <summary>{ui('Elevation reference', 'Referencias de elevación')}</summary>
    <div className="mola-legend-content">
      <p>{ui('Reference MOLA palette · 1 km intervals relative to the', 'Paleta MOLA de referencia · intervalos de 1 km respecto del')} <b>{ui('Martian areoid', 'areoide marciano')}</b>.</p>
      <div className="mola-scale" role="img"
        aria-label={ui('Illustrative color scale: purple and blue for low elevations, green and yellow for mid elevations, orange, brown and light tones for higher elevations.', 'Escala orientativa de colores: violeta y azul a elevaciones bajas; verde y amarillo intermedias; naranja, marrón y tonos claros más altas.')}
        style={{ backgroundImage: molaGradient }} />
      <div className="mola-ticks" aria-label={ui('Approximate references in kilometers', 'Referencias aproximadas en kilómetros')}>
        <span>−9</span><span>0</span><span>+10</span><span>+21</span>
      </div>
      <p className="mola-legend-note">{ui('Illustrative USGS table range (−9 to +21 km); approximate map extremes: −8.2 to +21.2 km. Shading and JPEG compression alter the color:', 'Escala ilustrativa de la tabla USGS (−9 a +21 km); extremos cartográficos aproximados: −8,2 a +21,2 km. El sombreado y la reducción JPEG alteran el color:')} <b>{ui('a pixel cannot establish precise elevation', 'no permite deducir una cota precisa de un píxel')}</b>.
        {ui('Blue does not signify water; colors are not natural.', 'El azul no es agua; los colores no son naturales.')}</p>
      <a href={MOLA_LEGEND_URL} target="_blank" rel="noreferrer">{ui('Official legend ↗', 'Leyenda oficial ↗')}</a>
      {' · '}
      <a href={MOLA_LOOKUP_URL} target="_blank" rel="noreferrer">{ui('USGS RGB table ↗', 'Tabla RGB USGS ↗')}</a>
    </div>
  </details>
}
