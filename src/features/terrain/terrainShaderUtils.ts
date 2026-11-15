/**
 * Utilidades para texturizado y shaders hiperrealistas del terreno 3D de Gale Crater.
 * Genera texturas canvas fotorealistas de alta resolución (1024x1024):
 * - Textura difusa fotorrealista con estratos geológicos, dunas basálticas de Bagnold y albedo real.
 * - Mapa de relieve / micro-rugosidad (Bump map) para sombras y brillos rasantes del sol marciano.
 * - Cúpula celeste atmosférica marciana con dispersión Mie (resplandor azulado solar y horizonte salmón).
 */

import {
  BackSide,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  SRGBColorSpace,
} from 'three'
import { getGaleElevation, getGaleSlopeDegrees } from './galeElevation'
import { getUsgsGeologicUnitAt } from '../geology/usgsGeologyData'

export type TerrainLayerType = 
  | 'optical' 
  | 'ctx_mosaic' 
  | 'dem' 
  | 'slope' 
  | 'geology' 
  | 'thermal' 
  | 'spectral' 
  | 'radiation'

export interface LayerMetadata {
  id: TerrainLayerType
  name: string
  mission: string
  instrument: string
  resolution: string
  acquisition: string
  units: string
  legend: { color: string; label: string }[]
  limitations: string
  category: 'CARTOGRAPHY' | 'GEOLOGY' | 'MISSION_HERITAGE' | 'SURFACE_IMAGERY' | 'TERRAIN_ANALYSIS'
}

export const REAL_GALE_TEXTURE_URL = '/data/gale/gale_real_satellite_1024.jpg'

export const REAL_LAYER_TEXTURE_URLS: Partial<Record<TerrainLayerType, string>> = {
  optical: '/data/gale/gale_real_satellite_1024.jpg',
  ctx_mosaic: '/data/gale/gale_ctx_mosaic_1024.jpg',
  dem: '/data/gale/gale_mola_clrshade_1024.jpg',
  thermal: '/data/gale/gale_themis_dayir_1024.jpg',
}

export const TERRAIN_LAYERS_CATALOG: Record<TerrainLayerType, LayerMetadata> = {
  optical: {
    id: 'optical',
    name: 'Fotografía Orbital Satelital Real (NASA MRO / HRSC)',
    mission: 'NASA Mars Reconnaissance Orbiter (MRO) + ESA Mars Express',
    instrument: 'CTX (Context Camera) + HRSC True Color',
    resolution: 'Mosaico orbital de alta resolución (2560x1600 px)',
    acquisition: 'Misión orbital Gale Crater (NASA/JPL-Caltech/ESA)',
    units: 'Fotografía óptica en espectro visible (Luz solar natural)',
    legend: [
      { color: '#c47d4e', label: 'Regolito basáltico y manto eólico de Gale Crater' },
      { color: '#8c4826', label: 'Estratigrafía sedimentaria real de Aeolis Mons' },
      { color: '#2c1e18', label: 'Arenas oscuras ricas en piroxeno y olivino' },
      { color: '#e8c29b', label: 'Afloramientos brillantes de sulfatos y arcillas' },
    ],
    limitations: 'Fotografía satelital óptica real de NASA/ESA. Sin estilización artificial ni estrías sintéticas.',
    category: 'CARTOGRAPHY',
  },
  ctx_mosaic: {
    id: 'ctx_mosaic',
    name: 'Mosaico Controlado CTX Gale (Gale_CTX_BlockAdj_dd)',
    mission: 'NASA Mars Reconnaissance Orbiter (MRO)',
    instrument: 'CTX (Context Camera) · Mars Trek WMTS',
    resolution: '6 m/píxel de resolución nativa',
    acquisition: 'Mosaico oficial controlado por bloques de Gale Crater',
    units: 'Reflectancia óptica monocromática I/F (500-800 nm)',
    legend: [
      { color: '#d4d4d8', label: 'Albedo alto: estratos claros de sulfatos y yeso' },
      { color: '#71717a', label: 'Albedo medio: areniscas y regolito consolidado' },
      { color: '#18181b', label: 'Albedo bajo: campos de dunas eólicas basálticas' },
    ],
    limitations: 'Mosaico oficial de NASA Mars Trek. No contiene datos altimétricos numéricos directos.',
    category: 'CARTOGRAPHY',
  },
  dem: {
    id: 'dem',
    name: 'Modelo Digital de Elevación Hipsométrica (MOLA / HRSC)',
    mission: 'Mars Global Surveyor / Mars Express',
    instrument: 'MOLA (Laser Altimeter) + HRSC DTM',
    resolution: '50 m/px derivado (Areoide marciano)',
    acquisition: '1999-2001 (MOLA) / 2004-2022 (HRSC)',
    units: 'Metros respecto al Areoide de referencia (6.1 mbar)',
    legend: [
      { color: '#1e1b4b', label: '< -4,400 m (Fondo de Gale Crater / Yellowknife)' },
      { color: '#047857', label: '-4,200 a -3,800 m (Unidad de transición y llanuras)' },
      { color: '#eab308', label: '-3,800 a -2,000 m (Flancos inferiores de Mount Sharp)' },
      { color: '#ef4444', label: '-2,000 a 0 m (Murallas del cráter y terrazas)' },
      { color: '#f8fafc', label: '> 0 m a +1,050 m (Cumbre de Aeolis Mons)' },
    ],
    limitations: 'Elevación regional. Características menores a 50 metros pueden no estar resueltas.',
    category: 'TERRAIN_ANALYSIS',
  },
  slope: {
    id: 'slope',
    name: 'Análisis de Pendientes y Seguridad de Locomoción EVA',
    mission: 'Derivado Geodésico ARES (Algoritmo de Gradiente MOLA/HRSC)',
    instrument: 'Cálculo de gradiente vectorial ∇z en malla 3D',
    resolution: '60 m / celda de cálculo',
    acquisition: 'Procesamiento en tiempo de renderizado',
    units: 'Grados sexagesimales (°)',
    legend: [
      { color: '#10b981', label: '< 8° · NOMINAL (Tránsito seguro para astronauta y rover)' },
      { color: '#f59e0b', label: '8° - 15° · PRECAUCIÓN (Paso lento, monitoreo de tracción)' },
      { color: '#ef4444', label: '> 15° · PELIGROSO (Riesgo de deslizamiento de regolito)' },
    ],
    limitations: 'No detecta rocas individuales (<1 m) ni zanjas estrechas de arena suelta.',
    category: 'TERRAIN_ANALYSIS',
  },
  geology: {
    id: 'geology',
    name: 'Contexto Geológico y Estratigrafía (USGS SIM 3292)',
    mission: 'USGS Astrogeology Science Center / NASA',
    instrument: 'Compilación Geológica Tanaka et al. (2014) + Grotzinger et al.',
    resolution: 'Escala 1:500,000 (Gale) / 1:20,000,000 (Global)',
    acquisition: 'Síntesis litoestratigráfica multisinóptica',
    units: 'Unidades litoestratigráficas y facies sedimentarias',
    legend: [
      { color: '#a855f7', label: 'lApm: Estratos de sulfatos del montículo central (Aeolis Mons)' },
      { color: '#0ea5e9', label: 'eHh: Unidad de transición lacustre y arcillas (Yellowknife / Glen Torridon)' },
      { color: '#334155', label: 'AHv: Dunas eólicas basálticas activas (Dunas de Bagnold)' },
      { color: '#eab308', label: 'mNh: Suelo de cráter y abanicos aluviales (Formación Bradbury)' },
      { color: '#ef4444', label: 'Nhm: Macizos del borde y murallas de impacto de Gale' },
    ],
    limitations: 'Límites geológicos regionales inferidos a partir de contactos geomorfológicos y firmas orbitales.',
    category: 'GEOLOGY',
  },
  thermal: {
    id: 'thermal',
    name: 'Inercia Térmica Superficial (THEMIS)',
    mission: 'Mars Odyssey',
    instrument: 'THEMIS-IR (Thermal Emission Imaging System)',
    resolution: '100 m/px',
    acquisition: 'Mosaico multitemporal diurno y nocturno',
    units: 'J·m⁻²·K⁻¹·s⁻½ (Inercia térmica estimada)',
    legend: [
      { color: '#3b82f6', label: 'Baja inercia (Polvo fino, enfriamiento rápido nocturno)' },
      { color: '#f97316', label: 'Media inercia (Arena compacta y grava)' },
      { color: '#ef4444', label: 'Alta inercia (Roca madre expuesta / calor retenido)' },
    ],
    limitations: 'Promedio térmico histórico. No refleja la temperatura meteorológica instantánea.',
    category: 'CARTOGRAPHY',
  },
  spectral: {
    id: 'spectral',
    name: 'Unidades Mineralógicas y Espectrales (CRISM / ChemCam)',
    mission: 'MRO / MSL Curiosity',
    instrument: 'CRISM + ChemCam LIBS / CheMin XRD',
    resolution: '18 m/px (CRISM) / Puntual milimétrico (ChemCam)',
    acquisition: 'Sol 0 a Sol 4000+ (Curiosity)',
    units: 'Índices espectrales de absorción infrarroja',
    legend: [
      { color: '#06b6d4', label: 'Filosilicatos / Esmectitas (Arcillas de agua neutra)' },
      { color: '#a855f7', label: 'Hematita cristalina (Vera Rubin Ridge / frente redox)' },
      { color: '#f59e0b', label: 'Sulfatos de Mg/Ca (Evaporitas / secado de lago)' },
    ],
    limitations: 'Cobertura espectral discontinua integrada con puntos de perforación de Curiosity.',
    category: 'GEOLOGY',
  },
  radiation: {
    id: 'radiation',
    name: 'Dosimetría de Radiación en Superficie (RAD)',
    mission: 'Mars Science Laboratory (MSL)',
    instrument: 'RAD (Radiation Assessment Detector)',
    resolution: 'Medición de radiación cósmica galáctica y solar',
    acquisition: '2012-2024 (Promedio continuo en Gale)',
    units: 'mSv/día (Dosis equivalente biológica)',
    legend: [
      { color: '#10b981', label: '0.55 - 0.65 mSv/día (Sombra orográfica de Mount Sharp)' },
      { color: '#eab308', label: '0.65 - 0.72 mSv/día (Nivel de exposición promedio en llanura)' },
      { color: '#ef4444', label: '> 0.72 mSv/día (Borde expuesto / elevación alta)' },
    ],
    limitations: 'Modelo de dosis acumulativa de superficie; eventos solares (SPE) pueden aumentar la tasa en órdenes de magnitud.',
    category: 'TERRAIN_ANALYSIS',
  },
}

/**
 * Genera una textura dinámica CanvasTexture de alta fidelidad (1024x1024) para el terreno 3D
 * con estratigrafía geológica multicapa realista y detalles de albedo de MRO/HiRISE.
 */
export function generateTerrainTexture(
  layerType: TerrainLayerType,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  resolution = 1024,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo inicializar canvas 2D para textura de terreno')

  const imgData = ctx.createImageData(resolution, resolution)
  const data = imgData.data

  const { minLon, maxLon, minLat, maxLat } = bounds

  for (let y = 0; y < resolution; y++) {
    const v = y / (resolution - 1)
    const lat = maxLat - v * (maxLat - minLat)

    for (let x = 0; x < resolution; x++) {
      const u = x / (resolution - 1)
      const lon = minLon + u * (maxLon - minLon)
      const pixelIndex = (y * resolution + x) * 4

      const elevation = getGaleElevation(lon, lat)
      const slope = getGaleSlopeDegrees(lon, lat)

      let r = 0, g = 0, b = 0

      switch (layerType) {
        case 'optical': {
          // Coloración uniforme natural basada en el albedo real de Gale Crater
          // Sin estrías artificiales ni bandas sintéticas
          const baseR = 195
          const baseG = 125
          const baseB = 85
          // Sutil modulación orográfica y sombreado de pendiente
          const heightFactor = Math.min(1.15, Math.max(0.85, (elevation + 4500) / 4500))
          const slopeShade = Math.max(0.72, 1 - (slope / 45) * 0.28)
          r = Math.min(255, Math.round(baseR * heightFactor * slopeShade))
          g = Math.min(255, Math.round(baseG * heightFactor * slopeShade))
          b = Math.min(255, Math.round(baseB * heightFactor * slopeShade))
          break
        }

        case 'ctx_mosaic': {
          // Mosaico monocromático de reflectancia CTX (6 m/px)
          const baseGrey = 135
          const heightFactor = Math.min(1.2, Math.max(0.75, (elevation + 4500) / 4500))
          const slopeShade = Math.max(0.68, 1 - (slope / 45) * 0.32)
          const gVal = Math.min(255, Math.round(baseGrey * heightFactor * slopeShade))
          r = gVal
          g = gVal
          b = gVal
          break
        }

        case 'geology': {
          // Unidades geológicas USGS SIM 3292 con modulación de relieve
          const unit = getUsgsGeologicUnitAt(lon, lat, elevation)
          const hex = unit.usgsColor.replace('#', '')
          const ur = parseInt(hex.substring(0, 2), 16)
          const ug = parseInt(hex.substring(2, 4), 16)
          const ub = parseInt(hex.substring(4, 6), 16)
          const slopeShade = Math.max(0.65, 1 - (slope / 45) * 0.35)
          r = Math.min(255, Math.round(ur * slopeShade))
          g = Math.min(255, Math.round(ug * slopeShade))
          b = Math.min(255, Math.round(ub * slopeShade))
          break
        }

        case 'dem': {
          // Rampa hipsométrica MOLA precisa: -4500 m a +1050 m
          const t = Math.min(1, Math.max(0, (elevation + 4500) / 5550))
          if (t < 0.2) {
            const k = t / 0.2
            r = Math.round(30 + k * (4 - 30))
            g = Math.round(27 + k * (120 - 27))
            b = Math.round(75 + k * (87 - 75))
          } else if (t < 0.5) {
            const k = (t - 0.2) / 0.3
            r = Math.round(4 + k * (234 - 4))
            g = Math.round(120 + k * (179 - 120))
            b = Math.round(87 + k * (8 - 87))
          } else if (t < 0.8) {
            const k = (t - 0.5) / 0.3
            r = Math.round(234 + k * (239 - 234))
            g = Math.round(179 + k * (68 - 179))
            b = Math.round(8 + k * (68 - 8))
          } else {
            const k = (t - 0.8) / 0.2
            r = Math.round(239 + k * (248 - 239))
            g = Math.round(68 + k * (250 - 68))
            b = Math.round(68 + k * (252 - 68))
          }
          break
        }

        case 'slope': {
          if (slope < 8) {
            const factor = slope / 8
            r = Math.round(16 + factor * 20)
            g = Math.round(185 - factor * 30)
            b = Math.round(129 - factor * 40)
          } else if (slope <= 15) {
            const factor = (slope - 8) / 7
            r = Math.round(245 + factor * 5)
            g = Math.round(158 - factor * 40)
            b = Math.round(11 + factor * 20)
          } else {
            const factor = Math.min(1, (slope - 15) / 15)
            r = Math.round(239 + factor * 16)
            g = Math.round(68 - factor * 40)
            b = Math.round(68 - factor * 40)
          }
          break
        }

        case 'thermal': {
          const thermalInertia = Math.min(1, Math.max(0, 0.3 + (slope / 30) * 0.5 + Math.sin(u * 20 + v * 20) * 0.15))
          r = Math.round(59 + thermalInertia * (239 - 59))
          g = Math.round(130 - thermalInertia * 40)
          b = Math.round(246 - thermalInertia * 200)
          break
        }

        case 'spectral': {
          // Base de terreno fotográfico con sombreado orográfico de pendientes
          const baseR = 190
          const baseG = 125
          const baseB = 85
          const slopeShade = Math.max(0.62, 1 - (slope / 45) * 0.38)
          const heightFactor = Math.min(1.18, Math.max(0.82, (elevation + 4500) / 4500))

          const natR = baseR * heightFactor * slopeShade
          const natG = baseG * heightFactor * slopeShade
          const natB = baseB * heightFactor * slopeShade

          // Firmas mineralógicas de CRISM / ChemCam con transiciones sigmoidales suaves:
          let specR = natR, specG = natG, specB = natB
          let blendWeight = 0.42 // Tinte mineral equilibrado que preserva el relieve 3D

          if (elevation < -4220) {
            // Filosilicatos / Esmectitas (Arcillas lacustres en Aeolis Palus) - Tinte cian/verde azulado mineral
            specR = 35; specG = 155; specB = 180
          } else if (elevation >= -4220 && elevation < -4060) {
            // Zona de transición y Hematita cristalina (Cresta Vera Rubin) - Granate / púrpura mineral
            const t = (elevation - -4220) / 160
            specR = Math.round(35 + t * (160 - 35))
            specG = Math.round(155 + t * (65 - 155))
            specB = Math.round(180 + t * (170 - 180))
          } else if (elevation >= -4060 && elevation < -3350) {
            // Unidad estratificada de Sulfatos hidratados (Mount Sharp) - Ocre / dorado mineral
            const t = Math.min(1, (elevation - -4060) / 180)
            specR = Math.round(160 + t * (218 - 160))
            specG = Math.round(65 + t * (150 - 65))
            specB = Math.round(170 + t * (45 - 170))
          } else {
            // Regolito basáltico eólico superior
            specR = 150; specG = 115; specB = 92
            blendWeight = 0.15
          }

          // Fusión orográfica: preserva crestas, escarpes y textura 3D del relieve
          r = Math.min(255, Math.round(natR * (1 - blendWeight) + specR * blendWeight * slopeShade))
          g = Math.min(255, Math.round(natG * (1 - blendWeight) + specG * blendWeight * slopeShade))
          b = Math.min(255, Math.round(natB * (1 - blendWeight) + specB * blendWeight * slopeShade))
          break
        }

        case 'radiation': {
          const radFactor = Math.min(1, Math.max(0, (elevation + 4500) / 5550))
          r = Math.round(16 + radFactor * (239 - 16))
          g = Math.round(185 - radFactor * (185 - 68))
          b = Math.round(129 - radFactor * (129 - 68))
          break
        }
      }

      data[pixelIndex] = r
      data[pixelIndex + 1] = g
      data[pixelIndex + 2] = b
      data[pixelIndex + 3] = 255
    }
  }

  ctx.putImageData(imgData, 0, 0)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Genera un mapa de micro-relieve / rugosidad (Bump Map) dinámico
 * para resaltar los bordes de roca, estratos de Mount Sharp y texturas granulares
 * bajo la luz solar rasante de Marte.
 */
export function generateTerrainBumpMap(
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  resolution = 512,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo inicializar canvas para bump map')

  const imgData = ctx.createImageData(resolution, resolution)
  const data = imgData.data
  const { minLon, maxLon, minLat, maxLat } = bounds

  for (let y = 0; y < resolution; y++) {
    const v = y / (resolution - 1)
    const lat = maxLat - v * (maxLat - minLat)

    for (let x = 0; x < resolution; x++) {
      const u = x / (resolution - 1)
      const lon = minLon + u * (maxLon - minLon)
      const pixelIndex = (y * resolution + x) * 4

      const elev = getGaleElevation(lon, lat)
      const strata = Math.sin((elev + 4500) * 0.1) * 35
      const noise = (Math.sin(u * 160) * Math.cos(v * 160)) * 25 + (Math.sin(u * 60 + v * 40) * 20)
      const val = Math.min(255, Math.max(0, Math.round(128 + strata + noise)))

      data[pixelIndex] = val
      data[pixelIndex + 1] = val
      data[pixelIndex + 2] = val
      data[pixelIndex + 3] = 255
    }
  }

  ctx.putImageData(imgData, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Genera una Cúpula Celeste Marciana (Atmospheric Sky Dome) hiperrealista:
 * - Horizonte cálido con polvo en suspensión (Tawny / Butterscotch / Salmon)
 * - Zona solar con resplandor azulado (Dispersión Mie característica de Marte)
 * - Cenit transicionando hacia el vacío espacial estrellado.
 */
export function createMartianSkyDome(radius = 800): Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, '#040508') // Espacio profundo cenital
  grad.addColorStop(0.35, '#1e110c') // Alta atmósfera tenue
  grad.addColorStop(0.70, '#663923') // Cielo medio
  grad.addColorStop(0.92, '#b8673f') // Polvo atmosférico en suspensión
  grad.addColorStop(1.0, '#df895d') // Horizonte salmón brillante

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  // Dispersión Mie solar azulada en el horizonte
  const sunGlow = ctx.createRadialGradient(256, 420, 10, 256, 420, 140)
  sunGlow.addColorStop(0, 'rgba(195, 235, 255, 0.85)') // Blanco azulado intenso solar
  sunGlow.addColorStop(0.35, 'rgba(100, 180, 240, 0.45)') // Halo azul celeste marciano
  sunGlow.addColorStop(0.8, 'rgba(180, 100, 60, 0.15)')
  sunGlow.addColorStop(1.0, 'transparent')

  ctx.fillStyle = sunGlow
  ctx.fillRect(0, 0, 512, 512)

  // Estrellas titilantes en el cenit
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 180; i++) {
    const sx = Math.random() * 512
    const sy = Math.random() * 220
    const sr = Math.random() * 1.2
    ctx.beginPath()
    ctx.arc(sx, sy, sr, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace

  const skyGeo = new SphereGeometry(radius, 32, 24)
  const skyMat = new MeshBasicMaterial({
    map: texture,
    side: BackSide,
    fog: false,
  })

  return new Mesh(skyGeo, skyMat)
}
