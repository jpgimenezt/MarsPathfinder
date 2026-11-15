// Ejecutar sobre el build servido por Vite Preview con Chrome abierto con
// --remote-debugging-port=9261. No modifica datos ni lanza un despliegue.
import { writeFile } from 'node:fs/promises'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4231/'
const cdpUrl = process.argv[3] ?? 'http://127.0.0.1:9261'
const captureName = process.argv[4] ?? 'jezero-map'
const sizes = [[1440, 900], [1584, 928], [375, 812], [390, 844]]

async function verify(width, height) {
  const tab = await (await fetch(`${cdpUrl}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' })).json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  const pending = new Map()
  const errors = []
  const responses = []
  const minimumCtxTiles = width < 680 ? 2 : 12
  let id = 0
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    if (pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
    if (message.method === 'Network.responseReceived') responses.push(message.params.response)
  }
  await new Promise(resolve => { ws.onopen = resolve })
  const send = (method, params = {}) => new Promise(resolve => {
    const next = ++id
    pending.set(next, resolve)
    ws.send(JSON.stringify({ id: next, method, params }))
  })
  const evaluate = async expression => {
    const result = (await send('Runtime.evaluate', { expression, returnByValue: true })).result
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  try {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 680 })
    await send('Runtime.enable')
    await send('Page.enable')
    await send('Network.enable')
    await new Promise(resolve => setTimeout(resolve, 1100))
    await evaluate('document.querySelector(".globe-primary")?.click()')
    // La primera tesela recibida NO acredita que CTX llenó la vista: esperar
    // varias imágenes de cada fuente y comprobar el canvas.
    for (let attempt = 0; attempt < 30; attempt++) {
      const viking = responses.filter(response => response.status === 200 && response.url.includes('Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//'))
      const ctx = responses.filter(response => response.status === 200 && response.url.includes('JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0//'))
      if (viking.length >= 2 && ctx.length >= minimumCtxTiles) break
      await new Promise(resolve => setTimeout(resolve, 350))
    }
    // Esperar el render posterior a las respuestas, no solo la primera tesela.
    await new Promise(resolve => setTimeout(resolve, 1000))
    const metrics = await evaluate(`(() => {
      const rect = selector => {
        const box = document.querySelector(selector)?.getBoundingClientRect()
        return box && { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        toolbar: rect('.toolbar'),
        nav: rect('.nav-tools'),
        map: rect('.map'),
        stage: rect('.map-stage'),
        panel: rect('.drawer'),
        base: rect('.base-status'),
        canvas: !!document.querySelector('.map canvas'),
        baseState: document.querySelector('.base-status')?.textContent,
      }
    })()`)
    const tiles = {
      viking: responses.filter(response => response.status === 200 && response.url.includes('Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//')).length,
      ctx: responses.filter(response => response.status === 200 && response.url.includes('JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0//')).length,
    }
    const screenshot = (await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).result.data
    const file = `docs/evidence/${captureName}-${width}x${height}.png`
    await writeFile(file, Buffer.from(screenshot, 'base64'))
    const visible = rect => rect && rect.left >= 0 && rect.right <= width && rect.top >= 0 && rect.bottom <= height
    if (metrics.scrollWidth > width || !visible(metrics.nav) || !visible(metrics.toolbar) ||
        !metrics.canvas || tiles.viking < 2 || tiles.ctx < minimumCtxTiles || errors.length ||
        (width > 680 && metrics.panel?.right > metrics.map?.left)) {
      throw new Error(JSON.stringify({ width, height, metrics, tiles, errors }))
    }
    console.log(JSON.stringify({ file, metrics, tiles, errors }))
  } finally {
    ws.close()
  }
}

for (const [width, height] of sizes) await verify(width, height)
