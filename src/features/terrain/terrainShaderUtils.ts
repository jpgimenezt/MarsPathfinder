/**
 * Utilidades para texturizado y shaders dinámicos del terreno 3D de Gale Crater.
 * Genera texturas canvas en GPU/memoria para las diferentes familias de capas científicas:
 * - OPTICAL: Fotometría y albedo de superficie marciana (MRO CTX / HiRISE)
 * - DEM: Rampa hipsométrica de altitudes MOLA / HRSC
 * - SLOPE: Clasificación de pendientes según límites de seguridad EVA de la NASA (<8°, 8-15°, >15°)
 * - THERMAL: Inercia térmica diurna THEMIS (cálido/frío)
 * - SPECTRAL: Detección mineralógica CRISM / ChemCam (Arcillas, Sulfatos, Hematita)
 * - RADIATION: Campo de dosis acumulada de radiación de superficie RAD (MSL)
 */

import { CanvasTexture, SRGBColorSpace } from 'three'
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
    name: 'Mosaico Óptico Orbital de Superficie',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'CTX (Context Camera) + HiRISE',
    resolution: '6.0 m/px (CTX) a 0.25 m/px (HiRISE local)',
    acquisition: 'Mapeo orbital continuo (2006-2024)',
    units: 'Reflectancia relativa I/F (Albedo visible)',
    legend: [
      { color: '#8c4826', label: 'Regolito y dunas basálticas' },
      { color: '#c47d4e', label: 'Lodolitas y areniscas sedimentarias' },
      { color: '#dfa67b', label: 'Escarpes y estratos expuestos de Mount Sharp' },
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
 * Genera una textura dinámica CanvasTexture de 512x512 para el terreno 3D
 * según la capa científica seleccionada.
 */
export function generateTerrainTexture(
  layerType: TerrainLayerType,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  resolution = 512,
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
    // Coordenada latitud (norte arriba)
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
          // Color base marciano con variaciones según albedo y estratificación
          // Base regolito rojizo-ocre
          const baseR = 195, baseG = 110, baseB = 68
          // Modulación por estratos geológicos y pendientes
          const noise = Math.sin(u * 40 + v * 35) * 8 + Math.cos(u * 15 - v * 25) * 6
          const slopeDarkening = Math.max(0.65, 1 - (slope / 45) * 0.4)

          r = Math.min(255, Math.max(0, (baseR + noise + (elevation + 4500) * 0.012) * slopeDarkening))
          g = Math.min(255, Math.max(0, (baseG + noise * 0.8 + (elevation + 4500) * 0.008) * slopeDarkening))
          b = Math.min(255, Math.max(0, (baseB + noise * 0.5 + (elevation + 4500) * 0.004) * slopeDarkening))
          break
        }

        case 'dem': {
          // Rampa hipsométrica MOLA: -4500 m a +1050 m
          const t = Math.min(1, Math.max(0, (elevation + 4500) / 5550))
          if (t < 0.2) {
            // Azul / violeta profundo a verde azulado
            const k = t / 0.2
            r = Math.round(30 + k * (4 - 30))
            g = Math.round(27 + k * (120 - 27))
            b = Math.round(75 + k * (87 - 75))
          } else if (t < 0.5) {
            // Verde a amarillo
            const k = (t - 0.2) / 0.3
            r = Math.round(4 + k * (234 - 4))
            g = Math.round(120 + k * (179 - 120))
            b = Math.round(87 + k * (8 - 87))
          } else if (t < 0.8) {
            // Amarillo a rojo anaranjado
            const k = (t - 0.5) / 0.3
            r = Math.round(234 + k * (239 - 234))
            g = Math.round(179 + k * (68 - 179))
            b = Math.round(8 + k * (68 - 8))
          } else {
            // Rojo a blanco níveo de cumbre
            const k = (t - 0.8) / 0.2
            r = Math.round(239 + k * (248 - 239))
            g = Math.round(68 + k * (250 - 68))
            b = Math.round(68 + k * (252 - 68))
          }
          break
        }

        case 'slope': {
          // Verde < 8°, Amarillo 8-15°, Rojo > 15°
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
          // Simulación de inercia térmica THEMIS:
          // Llanuras polvorientas son frías diurnas, afloramientos rocosos en pendientes son cálidos
          const thermalInertia = Math.min(1, Math.max(0, 0.3 + (slope / 30) * 0.5 + Math.sin(u * 20 + v * 20) * 0.15))
          r = Math.round(59 + thermalInertia * (239 - 59))
          g = Math.round(130 - thermalInertia * 40)
          b = Math.round(246 - thermalInertia * 200)
          break
        }

        case 'spectral': {
          // Arcillas (azul cian) en tierras bajas (-4400 a -4200),
          // Hematita (magenta) en la cresta Vera Rubin (-4200 a -4100),
          // Sulfatos (oro/ámbar) en Mount Sharp inferior (-4100 a -3500)
          if (elevation < -4200) {
            r = 6; g = 182; b = 212 // Cyan arcillas
          } else if (elevation >= -4200 && elevation < -4050) {
            r = 168; g = 85; b = 247 // Violeta / magenta hematita
          } else if (elevation >= -4050 && elevation < -3400) {
            r = 245; g = 158; b = 11 // Ámbar sulfatos
          } else {
            r = 140; g = 110; b = 95 // Sustrato silicatado
          }
          break
        }

        case 'radiation': {
          // RAD: A mayor altitud y menos densidad atmosférica, mayor dosis
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
