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

export type TerrainLayerType = 'optical' | 'dem' | 'slope' | 'thermal' | 'spectral' | 'radiation'

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
}

export const TERRAIN_LAYERS_CATALOG: Record<TerrainLayerType, LayerMetadata> = {
  optical: {
    id: 'optical',
    name: 'Mosaico Óptico Hiperrealista (CTX / HiRISE)',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'CTX (Context Camera) + HiRISE Albedo',
    resolution: '6.0 m/px (CTX) a 0.25 m/px (HiRISE local)',
    acquisition: 'Mapeo orbital continuo (2006-2024)',
    units: 'Reflectancia relativa I/F (Albedo visible)',
    legend: [
      { color: '#2c1e18', label: 'Dunas basálticas oscuras (Bagnold Dunes)' },
      { color: '#8c4826', label: 'Regolito y gravas de impacto' },
      { color: '#c47d4e', label: 'Lodolitas y areniscas sedimentarias' },
      { color: '#e8c29b', label: 'Estratos claros de sulfatos y yeso (Mount Sharp)' },
    ],
    limitations: 'Imagen fotométrica; no mide directamente altura, pendiente ni estabilidad de suelo.',
  },
  dem: {
    id: 'dem',
    name: 'Modelo Digital de Elevación Hipsométrica (DEM)',
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
          // 1. Capa geológica estratificada de Mount Sharp (estratos rítmicos sedimentarios)
          const strataFrequency = 0.08
          const strataBand = Math.sin((elevation + 4500) * strataFrequency) * 0.5 + 0.5

          // 2. Micro-relieve y grano de regolito
          const noise1 = Math.sin(u * 120 + v * 90) * 12
          const noise2 = Math.cos(u * 45 - v * 65) * 8
          const fineGrain = (Math.sin(u * 380) * Math.cos(v * 380)) * 6
          const combinedNoise = noise1 + noise2 + fineGrain

          // 3. Campo de dunas oscuras basálticas (Bagnold Dunes) en zonas deprimidas entre -4400 m y -4100 m
          const isDuneField = elevation < -4150 && elevation > -4420 && Math.sin(u * 35 + v * 20) > 0.45

          if (isDuneField) {
            // Arena basáltica rica en hierro / piroxeno oscuro (#2c1e18)
            const duneShade = Math.sin(u * 140) * 14
            r = Math.min(255, Math.max(20, 52 + combinedNoise * 0.4 + duneShade))
            g = Math.min(255, Math.max(15, 38 + combinedNoise * 0.3 + duneShade * 0.7))
            b = Math.min(255, Math.max(10, 30 + combinedNoise * 0.2 + duneShade * 0.5))
          } else if (elevation > -3800) {
            // Flancos superiores de Mount Sharp: estratos alternados de sulfatos claros y areniscas ocres
            const strataBright = strataBand * 32
            r = Math.min(255, Math.max(0, 195 + strataBright + combinedNoise))
            g = Math.min(255, Math.max(0, 138 + strataBright * 0.85 + combinedNoise * 0.8))
            b = Math.min(255, Math.max(0, 96 + strataBright * 0.7 + combinedNoise * 0.6))
          } else {
            // Llanuras y lecho de Gale: regolito ocre marciano clásico (#a85c39 / #c47d4e)
            const slopeDark = Math.max(0.6, 1 - (slope / 45) * 0.35)
            r = Math.min(255, Math.max(0, (178 + combinedNoise) * slopeDark))
            g = Math.min(255, Math.max(0, (108 + combinedNoise * 0.8) * slopeDark))
            b = Math.min(255, Math.max(0, (68 + combinedNoise * 0.6) * slopeDark))
          }
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
          if (elevation < -4200) {
            r = 6; g = 182; b = 212 // Cyan arcillas
          } else if (elevation >= -4200 && elevation < -4050) {
            r = 168; g = 85; b = 247 // Magenta hematita
          } else if (elevation >= -4050 && elevation < -3400) {
            r = 245; g = 158; b = 11 // Ámbar sulfatos
          } else {
            r = 140; g = 110; b = 95
          }
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
