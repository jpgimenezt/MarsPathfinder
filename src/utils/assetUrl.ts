/**
 * Resuelve rutas de assets locales considerando import.meta.env.BASE_URL para que
 * funcionen de manera idéntica en localhost, subdirectorios y despliegues estáticos (Vercel, GitHub Pages).
 */
export function resolveAssetUrl(url: string | undefined | null): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const cleanPath = url.replace(/^\/+/, '')
  const base = import.meta.env.BASE_URL || './'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}${cleanPath}`
}
