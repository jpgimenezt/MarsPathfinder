/**
 * MISSION DISCOVERY TOUR — DATOS DEL RECORRIDO CINEMATOGRÁFICO SOBRE GALE CRATER
 * 
 * Define la secuencia de sobrevuelo 3D sobre hitos científicos clave:
 * 1. Bradbury Base (Sitio LZ-1 y Hábitat Base Alfa)
 * 2. Bahía Yellowknife (Lago antiguo habitable)
 * 3. Dunas de Bagnold (Campo eólico activo)
 * 4. Vera Rubin Ridge (Cresta de hematita)
 * 5. Glen Torridon (Valle de arcillas)
 * 6. Pontours (Grietas poligonales de desecación)
 * 7. Gediz Vallis Ridge (Canal de aluvión y flancos de Mount Sharp)
 */

export interface TourStop {
  id: string
  title: string
  subtitle: string
  sol: number
  earthDate: string
  coordinates: { lon: number; lat: number }
  elevationMeters: number
  geologicalUnit: string
  scientificValue: string
  imageUrl: string
  imageCredit: string
  cameraPositionOffset: { dx: number; dy: number; dz: number }
  lookAtOffset: { dx: number; dy: number; dz: number }
  flightDurationSeconds: number
}

export const MISSION_DISCOVERY_STOPS: TourStop[] = [
  {
    id: 'tour-bradbury',
    title: 'Bradbury Base (Sitio Candidato LZ-1)',
    subtitle: 'Elipse de Aterrizaje Norte y Asentamiento Humano Base Alfa',
    sol: 0,
    earthDate: '2012-08-06',
    coordinates: { lon: 137.4417, lat: -4.5895 },
    elevationMeters: -4520,
    geologicalUnit: 'mNh: Formación Bradbury (Suelo aluvial consolidado)',
    scientificValue: 'Zona más baja y protegida de la cuenca con máxima columna atmosférica (8.5 hPa), óptima para aterrizaje propulsado y soporte vital.',
    imageUrl: 'data/curiosity/bradbury-landing.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    cameraPositionOffset: { dx: 18, dy: 14, dz: 22 },
    lookAtOffset: { dx: 0, dy: 1, dz: 0 },
    flightDurationSeconds: 12,
  },
  {
    id: 'tour-yellowknife',
    title: 'Bahía Yellowknife (Sitio John Klein)',
    subtitle: 'Primer Lago de Agua Dulce Neutra Identificado en Marte',
    sol: 126,
    earthDate: '2012-12-17',
    coordinates: { lon: 137.4485, lat: -4.5925 },
    elevationMeters: -4520,
    geologicalUnit: 'eHh: Miembro Sheepbed (Lutitas lacustres)',
    scientificValue: 'Primera perforación en roca de otro planeta. Confirmó condiciones de habitabilidad microbiana con carbono, hidrógeno, oxígeno, fósforo y azufre.',
    imageUrl: 'data/curiosity/yellowknife-bay.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    cameraPositionOffset: { dx: 14, dy: 10, dz: 16 },
    lookAtOffset: { dx: 0, dy: 0.5, dz: 0 },
    flightDurationSeconds: 12,
  },
  {
    id: 'tour-bagnold',
    title: 'Dunas de Bagnold',
    subtitle: 'Campo Eólico de Arenas Basálticas Oscuras Activas',
    sol: 1190,
    earthDate: '2015-12-13',
    coordinates: { lon: 137.3910, lat: -4.7215 },
    elevationMeters: -4410,
    geologicalUnit: 'AHv: Dunas barjánides activas ricas en olivino',
    scientificValue: 'Primer estudio in-situ de dunas activas extraterrestres. Ondulaciones generadas por la atmósfera tenue marciana de 6 mbar.',
    imageUrl: 'data/gale/pia19674_gale_mosaic.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    cameraPositionOffset: { dx: -16, dy: 12, dz: 18 },
    lookAtOffset: { dx: 0, dy: 0.8, dz: 0 },
    flightDurationSeconds: 14,
  },
  {
    id: 'tour-verarubin',
    title: 'Cresta Vera Rubin Ridge',
    subtitle: 'Escarpe Resistente con Intensa Firma de Hematita Cristalina',
    sol: 1809,
    earthDate: '2017-09-08',
    coordinates: { lon: 137.4115, lat: -4.7640 },
    elevationMeters: -4280,
    geologicalUnit: 'eHh: Miembro Blunts Point (Escarpe de óxido de hierro)',
    scientificValue: 'Afloramiento resistente que sobrevivió a millones de años de erosión eólica, testigo de interacción hidrotérmica subterránea redox.',
    imageUrl: 'data/curiosity/vera-rubin-ridge.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    cameraPositionOffset: { dx: 20, dy: 15, dz: 15 },
    lookAtOffset: { dx: -2, dy: 1, dz: -2 },
    flightDurationSeconds: 14,
  },
  {
    id: 'tour-glentorridon',
    title: 'Glen Torridon (Valle de las Arcillas)',
    subtitle: 'Mayor Concentración de Esmectitas y Filosilicatos de Gale',
    sol: 2300,
    earthDate: '2019-01-26',
    coordinates: { lon: 137.4150, lat: -4.7820 },
    elevationMeters: -4210,
    geologicalUnit: 'eHh: Unidad arcillosa de aguas tranquilas',
    scientificValue: 'Valle de sedimentación lenta en aguas templadas y no ácidas. Excelente matriz para la preservación fósil de biomoléculas orgánicas.',
    imageUrl: 'data/curiosity/mount-sharp-boxwork.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    cameraPositionOffset: { dx: -18, dy: 14, dz: 16 },
    lookAtOffset: { dx: 0, dy: 1, dz: 0 },
    flightDurationSeconds: 14,
  },
  {
    id: 'tour-pontours',
    title: 'Pontours (Unidad de Sulfatos)',
    subtitle: 'Grietas Hexagonales Fósiles de Barro Desecado',
    sol: 3148,
    earthDate: '2021-06-15',
    coordinates: { lon: 137.4280, lat: -4.7390 },
    elevationMeters: -3980,
    geologicalUnit: 'lApm: Unidad de transición lacustre a evaporítica',
    scientificValue: 'Primera evidencia indiscutible de alternancia estacional húmedo-seco en Marte primitivo, un requisito esencial para la química prebiótica.',
    imageUrl: 'data/curiosity/pontours-mud-cracks.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    cameraPositionOffset: { dx: 14, dy: 12, dz: 14 },
    lookAtOffset: { dx: 0, dy: 0.5, dz: 0 },
    flightDurationSeconds: 14,
  },
  {
    id: 'tour-gedizvallis',
    title: 'Cordillera de Gediz Vallis y Flancos de Mount Sharp',
    subtitle: 'Flujos Aluviales Masivos Provenientes de la Cumbre',
    sol: 3800,
    earthDate: '2023-04-18',
    coordinates: { lon: 137.4420, lat: -4.8510 },
    elevationMeters: -3650,
    geologicalUnit: 'lApm: Depósito de derrubios de alta energía de Aeolis Mons',
    scientificValue: 'Canal esculpido por violentos aluviones tardíos de lodo y bloques gigantes que descendieron cuando el resto del cráter ya estaba seco.',
    imageUrl: 'data/curiosity/mount-sharp-panorama.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS',
    cameraPositionOffset: { dx: 22, dy: 18, dz: 24 },
    lookAtOffset: { dx: 0, dy: 2, dz: 0 },
    flightDurationSeconds: 16,
  },
]

// English presentation content only. Coordinates, acquisition dates and
// camera paths are inherited unchanged; modeled elevations are not verified.
const EN_TOUR_CONTENT: Record<string, Pick<TourStop, 'title' | 'subtitle' | 'geologicalUnit' | 'scientificValue'>> = {
  'tour-bradbury': {
    title: 'Bradbury Landing / conceptual LZ-1', subtitle: 'Curiosity landing context; Base Alpha is simulated',
    geologicalUnit: 'mNh: Bradbury context (regional alluvial units)',
    scientificValue: 'Bradbury Landing is Curiosity’s documented landing site. The human habitat and LZ-1 designation are conceptual; no landing safety or local pressure has been verified for this model.',
  },
  'tour-yellowknife': {
    title: 'Yellowknife Bay (John Klein)', subtitle: 'Ancient lakebed and habitability context',
    geologicalUnit: 'eHh: Sheepbed mudstone context',
    scientificValue: 'Curiosity examined mudstones consistent with a past habitable aqueous environment. This is evidence of ancient conditions, not evidence of life.',
  },
  'tour-bagnold': {
    title: 'Bagnold Dunes', subtitle: 'Active dark aeolian dune field',
    geologicalUnit: 'AHv: dark dune context',
    scientificValue: 'Curiosity investigated active Martian dune processes. Tour camera positions are illustrative, not independently surveyed stop locations.',
  },
  'tour-verarubin': {
    title: 'Vera Rubin Ridge', subtitle: 'Hematite-bearing ridge',
    geologicalUnit: 'eHh: Blunts Point geological context',
    scientificValue: 'The hematite-bearing ridge provides a record of changing conditions in the sedimentary history of Gale Crater.',
  },
  'tour-glentorridon': {
    title: 'Glen Torridon', subtitle: 'Clay-bearing geological context',
    geologicalUnit: 'eHh: regional clay-bearing unit',
    scientificValue: 'Curiosity investigated clay-bearing sedimentary rocks, providing context for ancient water and changing environmental conditions.',
  },
  'tour-pontours': {
    title: 'Pontours', subtitle: 'Ancient mud-crack context',
    geologicalUnit: 'lApm: lacustrine-to-evaporitic context',
    scientificValue: 'Polygonal cracks studied by Curiosity may record episodes of wet and dry conditions; these features do not establish a precise local route surface.',
  },
  'tour-gedizvallis': {
    title: 'Gediz Vallis ridge and Mount Sharp flank', subtitle: 'Late-stage water-related deposit context',
    geologicalUnit: 'lApm: regional debris-flow context',
    scientificValue: 'Gediz Vallis provides evidence for water-related processes late in Gale’s history. Simulated tour elevation and viewpoint remain unvalidated.',
  },
}

export function localizedDiscoveryStop(stop: TourStop, language: 'en' | 'es'): TourStop {
  return language === 'en' ? { ...stop, ...EN_TOUR_CONTENT[stop.id] } : stop
}
