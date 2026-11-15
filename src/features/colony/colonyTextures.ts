/**
 * ARES — Generador de Texturas PBR Procedurales para Modelos 3D de Infraestructura
 * Crea mapas de textura de alta resolución con Canvas2D (con fallback seguro para SSR/tests):
 * - Papel de oro térmico multicapa (Kapton MLI) arrugado con costuras de cinta térmica
 * - Células fotovoltaicas de arseniuro de galio / silicio con barras colectoras de plata
 * - Placas de casco aeroespacial blanco con líneas de remaches, ranuras y marcas técnicas
 * - Fibra de carbono y armazones estructurales de titanio
 * - Dibujo de rodadura chevron para neumáticos elásticos del rover
 * - Manto de regolito sinterizado impreso en 3D con estratos de deposición
 * - Biomasa vegetal densa con iluminación fotosintética para el invernadero
 */

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function safeCreateCanvasTexture(
  drawFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  width = 512,
  height = 512,
  repeatX = 1,
  repeatY = 1,
): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    drawFn(ctx, width, height)

    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(repeatX, repeatY)
    tex.needsUpdate = true
    return tex
  } catch {
    return null
  }
}

/**
 * Textura de aislamiento térmico de oro/Kapton MLI arrugado (Descent stage, tanques ISRU, trajes)
 */
export function createKaptonMliTexture(): CanvasTexture | null {
  return safeCreateCanvasTexture((ctx, w, h) => {
    // Fondo degradado dorado profundo
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#b45309')
    grad.addColorStop(0.35, '#d97706')
    grad.addColorStop(0.7, '#f59e0b')
    grad.addColorStop(1, '#b45309')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Arrugas de lámina de foil metálico
    ctx.lineWidth = 1.5
    for (let i = 0; i < 90; i++) {
      const x1 = Math.random() * w
      const y1 = Math.random() * h
      const length = 20 + Math.random() * 60
      const angle = Math.random() * Math.PI * 2
      const x2 = x1 + Math.cos(angle) * length
      const y2 = y1 + Math.sin(angle) * length

      // Línea de sombra de arruga
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.65)'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Cresta de brillo especular
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)'
      ctx.beginPath()
      ctx.moveTo(x1 + 1, y1 - 1)
      ctx.lineTo(x2 + 1, y2 - 1)
      ctx.stroke()
    }

    // Costuras de cinta térmica dorada Kapton (cuadrícula de mantas)
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 6
    const step = w / 4
    for (let c = step; c < w; c += step) {
      ctx.beginPath()
      ctx.moveTo(c, 0)
      ctx.lineTo(c, h)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, c)
      ctx.lineTo(w, c)
      ctx.stroke()

      // Puntos de fijación de cinta
      ctx.fillStyle = '#fef08a'
      for (let r = 8; r < h; r += 24) {
        ctx.fillRect(c - 2, r, 4, 4)
        ctx.fillRect(r, c - 2, 4, 4)
      }
    }
  }, 512, 512, 2, 2)
}

/**
 * Textura fotovoltaica de arseniuro de galio / silicio de alta resolución
 */
export function createSolarCellTexture(): CanvasTexture | null {
  return safeCreateCanvasTexture((ctx, w, h) => {
    // Fondo azul marino espacial antireflectante
    ctx.fillStyle = '#060d24'
    ctx.fillRect(0, 0, w, h)

    const cols = 4
    const rows = 4
    const cellW = w / cols
    const cellH = h / rows
    const pad = 4

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW + pad
        const y = r * cellH + pad
        const cw = cellW - pad * 2
        const ch = cellH - pad * 2

        // Degradado de la oblea de silicio
        const cellGrad = ctx.createLinearGradient(x, y, x + cw, y + ch)
        cellGrad.addColorStop(0, '#10224d')
        cellGrad.addColorStop(0.5, '#1e3a8a')
        cellGrad.addColorStop(1, '#0c1a40')
        ctx.fillStyle = cellGrad

        // Oblea pseudo-cuadrada con esquinas achaflanadas
        const chamfer = 6
        ctx.beginPath()
        ctx.moveTo(x + chamfer, y)
        ctx.lineTo(x + cw - chamfer, y)
        ctx.lineTo(x + cw, y + chamfer)
        ctx.lineTo(x + cw, y + ch - chamfer)
        ctx.lineTo(x + cw - chamfer, y + ch)
        ctx.lineTo(x + chamfer, y + ch)
        ctx.lineTo(x, y + ch - chamfer)
        ctx.lineTo(x, y + chamfer)
        ctx.closePath()
        ctx.fill()

        // Micro-conductores verticales (fine fingers)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'
        ctx.lineWidth = 1
        for (let fx = x + 4; fx < x + cw - 4; fx += 5) {
          ctx.beginPath()
          ctx.moveTo(fx, y + chamfer)
          ctx.lineTo(fx, y + ch - chamfer)
          ctx.stroke()
        }

        // Barras colectoras horizontales de plata (busbars)
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 2.5
        const b1 = y + ch * 0.33
        const b2 = y + ch * 0.67
        ctx.beginPath()
        ctx.moveTo(x, b1)
        ctx.lineTo(x + cw, b1)
        ctx.moveTo(x, b2)
        ctx.lineTo(x + cw, b2)
        ctx.stroke()

        // Puntos de soldadura de interconexión
        ctx.fillStyle = '#e2e8f0'
        ctx.fillRect(x + cw * 0.5 - 2, b1 - 2, 4, 4)
        ctx.fillRect(x + cw * 0.5 - 2, b2 - 2, 4, 4)
      }
    }
  }, 512, 512, 1, 1)
}

/**
 * Textura de placas de casco aeroespacial blanco con líneas de remaches y marcas técnicas
 */
export function createHullPanelsTexture(): CanvasTexture | null {
  return safeCreateCanvasTexture((ctx, w, h) => {
    // Base de aleación aluminio-litio blanca
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, 0, w, h)

    // Cuadrícula de paneles aeroespaciales
    const rows = 4
    const cols = 4
    const pw = w / cols
    const ph = h / rows

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * pw
        const y = r * ph

        // Variación sutil de tono entre paneles contiguos
        const shade = (r + c) % 2 === 0 ? 'rgba(248, 250, 252, 0.5)' : 'rgba(226, 232, 240, 0.6)'
        ctx.fillStyle = shade
        ctx.fillRect(x + 2, y + 2, pw - 4, ph - 4)

        // Ranura de junta de separación de paneles
        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, pw, ph)

        // Resalte de bisel de luz
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 1, y + 1, pw - 2, ph - 2)

        // Remaches / pernos a lo largo del perímetro interior del panel
        ctx.fillStyle = '#94a3b8'
        for (let rx = x + 8; rx < x + pw - 6; rx += 16) {
          ctx.beginPath()
          ctx.arc(rx, y + 5, 1.2, 0, Math.PI * 2)
          ctx.arc(rx, y + ph - 5, 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
        for (let ry = y + 8; ry < y + ph - 6; ry += 16) {
          ctx.beginPath()
          ctx.arc(x + 5, ry, 1.2, 0, Math.PI * 2)
          ctx.arc(x + pw - 5, ry, 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Banda de advertencia perimetral (chevrons negro y naranja de seguridad)
    ctx.fillStyle = '#ea580c'
    ctx.fillRect(0, 0, w, 16)
    ctx.fillStyle = '#0f172a'
    for (let chX = -16; chX < w + 32; chX += 24) {
      ctx.beginPath()
      ctx.moveTo(chX, 0)
      ctx.lineTo(chX + 12, 0)
      ctx.lineTo(chX - 4, 16)
      ctx.lineTo(chX - 16, 16)
      ctx.closePath()
      ctx.fill()
    }

    // Marcado técnico stenciled en panel
    ctx.fillStyle = '#334155'
    ctx.font = 'bold 13px monospace'
    ctx.fillText('ARES // MARS-HAB 01', 28, 54)
    ctx.font = '10px monospace'
    ctx.fillText('PRESSURIZED ENCLOSURE 101.3 kPa', 28, 70)
    ctx.fillText('PRIMARY LIFE SUPPORT [ECLSS]', 28, 84)

    ctx.fillStyle = '#dc2626'
    ctx.font = 'bold 11px monospace'
    ctx.fillText('[!] CAUTION: HIGH PRESSURE HATCH', 28, 110)
  }, 512, 512, 2, 2)
}

/**
 * Textura de fibra de carbono estructural y aleaciones oscuras (Truss, antenas, brazos robóticos)
 */
export function createCarbonFiberTexture(): CanvasTexture | null {
  return safeCreateCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, w, h)

    const size = 8
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const isLight = ((x / size) + (y / size)) % 2 === 0
        ctx.fillStyle = isLight ? '#334155' : '#1e293b'
        ctx.fillRect(x, y, size, size)

        // Resalte de hebra tejida
        ctx.strokeStyle = isLight ? '#475569' : '#090d16'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y + size)
        ctx.lineTo(x + size, y)
        ctx.stroke()
      }
    }
  }, 256, 256, 4, 4)
}

/**
 * Textura de rodadura chevron para ruedas metálicas elásticas del Rover ARES
 */
export function createTireTreadTexture(): CanvasTexture | null {
  return safeCreateCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, w, h)

    // Patrón de tacos chevron en V
    ctx.fillStyle = '#0f172a'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2

    const step = 24
    for (let y = -step; y < h + step; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w / 2, y + step * 0.7)
      ctx.lineTo(w, y)
      ctx.lineTo(w, y + step * 0.4)
      ctx.lineTo(w / 2, y + step * 1.1)
      ctx.lineTo(0, y + step * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }, 256, 256, 1, 3)
}

/**
 * Textura de berma protectora de regolito sinterizado impreso en 3D (estratos de deposición)
 */
export function createRegolithBermTexture(): CanvasTexture | null {
  return safeCreateCanvasTexture((ctx, w, h) => {
    // Fondo rojo basáltico marciano
    ctx.fillStyle = '#7c2d12'
    ctx.fillRect(0, 0, w, h)

    // Estratos horizontales continuos de extrusión de regolito fundido
    for (let y = 0; y < h; y += 4) {
      const alpha = 0.25 + Math.sin(y * 0.2) * 0.2
      ctx.fillStyle = y % 8 === 0 ? `rgba(154, 52, 18, ${alpha})` : `rgba(194, 65, 12, ${alpha})`
      ctx.fillRect(0, y, w, 3.5)

      // Línea de unión entre pasadas de boquilla 3D
      ctx.strokeStyle = 'rgba(67, 20, 7, 0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }, 512, 512, 1, 4)
}

/**
 * Textura de biomasa vegetal densa con iluminación de cultivo fotosintético
 */
export function createCropsTexture(): CanvasTexture | null {
  return safeCreateCanvasTexture((ctx, w, h) => {
    // Fondo de tierra / sustrato hidropónico oscuro
    ctx.fillStyle = '#064e3b'
    ctx.fillRect(0, 0, w, h)

    // Follaje de plantas multicapa
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const r = 5 + Math.random() * 12
      const colors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#047857']
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Lavado de luz LED fotosintética púrpura/magenta
    const glow = ctx.createLinearGradient(0, 0, w, 0)
    glow.addColorStop(0, 'rgba(236, 72, 153, 0.18)')
    glow.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)')
    glow.addColorStop(1, 'rgba(236, 72, 153, 0.18)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)
  }, 256, 256, 2, 2)
}
