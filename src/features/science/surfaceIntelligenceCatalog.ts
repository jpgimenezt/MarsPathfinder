/**
 * MARS SURFACE INTELLIGENCE — CATÁLOGO DE IMÁGENES DE SUPERFICIE REALES
 * 
 * Fuentes oficiales:
 * - NASA Mars 2020 Perseverance Raw Images: https://mars.nasa.gov/mars2020/multimedia/raw-images/
 * - NASA Mars Science Laboratory Curiosity Raw Images: https://mars.nasa.gov/msl/multimedia/raw-images/
 * 
 * DISTINCIÓN GEOGRÁFICA RIGUROSA:
 * - Cráter Gale: Misión MSL Curiosity (137.44°E, 4.59°S). Terreno de operaciones local ARES.
 * - Cráter Jezero: Misión Mars 2020 Perseverance (77.45°E, 18.38°N). Análogo planetario comparativo.
 */

export interface SurfaceObservationImage {
  id: string
  title: string
  mission: 'Curiosity' | 'Perseverance'
  roverName: string
  targetRegion: string
  sol: number
  earthDate: string
  camera: 'Mastcam' | 'Mastcam-Z' | 'Navcam' | 'SuperCam' | 'ChemCam RMI' | 'MAHLI' | 'WATSON' | 'Hazcam'
  imageType: 'SURFACE_LANDSCAPE' | 'CLOSEUP_GEOLOGY' | 'ATMOSPHERE_SKY' | 'ROVER_HARDWARE' | 'DRILL_HOLE'
  imageUrl: string
  highResUrl: string
  nasaCredit: string
  geologicalContext: string
  coordinates?: { lon: number; lat: number }
  scienceSummary: string
  filtersUsed?: string
}

export const SURFACE_INTELLIGENCE_GALLERY: SurfaceObservationImage[] = [
  // --- GALE CRATER (CURIOSITY) ---
  {
    id: 'gale-pontours-mudcracks',
    title: 'Grietas Poligonales de Desecación de Barro (Pontours)',
    mission: 'Curiosity',
    roverName: 'Curiosity (MSL)',
    targetRegion: 'Cráter Gale · Flanco inferior de Mount Sharp',
    sol: 3148,
    earthDate: '2021-06-15',
    camera: 'Mastcam',
    imageType: 'CLOSEUP_GEOLOGY',
    imageUrl: 'data/curiosity/pontours-mud-cracks.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA24657.jpg',
    nasaCredit: 'NASA/JPL-Caltech/MSSS',
    geologicalContext: 'Unidad de transición de sulfatos; estratos de lutita lacustre.',
    coordinates: { lon: 137.428, lat: -4.739 },
    scienceSummary: 'Patrones hexagonales fósiles preservados en roca sedimentaria. Revela ciclos estacionales alternados de inundación y evaporación hace 3.6 mil millones de años.',
    filtersUsed: 'Filtro RGB calibrado Mastcam (L2/R2)',
  },
  {
    id: 'gale-gediz-vallis-ridge',
    title: 'Cresta de Gediz Vallis y Bloques de Aluvión Gigantes',
    mission: 'Curiosity',
    roverName: 'Curiosity (MSL)',
    targetRegion: 'Cráter Gale · Cordillera de Gediz Vallis',
    sol: 3924,
    earthDate: '2023-08-19',
    camera: 'Mastcam',
    imageType: 'SURFACE_LANDSCAPE',
    imageUrl: 'data/curiosity/mount-sharp-panorama.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA25997.jpg',
    nasaCredit: 'NASA/JPL-Caltech/MSSS',
    geologicalContext: 'Depósito de flujo de detritos fluviales de alta energía.',
    coordinates: { lon: 137.442, lat: -4.851 },
    scienceSummary: 'Canal esculpido por violentos aluviones de lodo y cantos rodados que descendieron desde las alturas inexploradas de Aeolis Mons.',
    filtersUsed: 'Mosaico panorámico teleobjetivo 100mm',
  },
  {
    id: 'gale-bagnold-dune-ripple',
    title: 'Ondulaciones de Viento en Dunas de Bagnold',
    mission: 'Curiosity',
    roverName: 'Curiosity (MSL)',
    targetRegion: 'Cráter Gale · Dunas de Bagnold',
    sol: 1192,
    earthDate: '2015-12-15',
    camera: 'Mastcam',
    imageType: 'SURFACE_LANDSCAPE',
    imageUrl: 'data/gale/pia19674_gale_mosaic.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA20168.jpg',
    nasaCredit: 'NASA/JPL-Caltech/MSSS',
    geologicalContext: 'Arenas eólicas basálticas activas ricas en olivino y piroxeno.',
    coordinates: { lon: 137.391, lat: -4.7215 },
    scienceSummary: 'Crestas eólicas decamétricas producidas por la tenue atmósfera de 6 mbar de Marte. Muestra física de transporte de granos en gravedad reducida (0.38g).',
    filtersUsed: 'Filtro visible color natural',
  },
  {
    id: 'gale-yellowknife-cumberland',
    title: 'Perforación de Cumberland en Lutita Lacustre',
    mission: 'Curiosity',
    roverName: 'Curiosity (MSL)',
    targetRegion: 'Cráter Gale · Bahía Yellowknife',
    sol: 279,
    earthDate: '2013-05-19',
    camera: 'MAHLI',
    imageType: 'DRILL_HOLE',
    imageUrl: 'data/curiosity/yellowknife-bay.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA16937.jpg',
    nasaCredit: 'NASA/JPL-Caltech/MSSS',
    geologicalContext: 'Miembro Sheepbed, Formación Yellowknife Bay.',
    coordinates: { lon: 137.4485, lat: -4.5925 },
    scienceSummary: 'Polvo de perforación grisáceo (no oxidado) que demostró por primera vez que el interior de las rocas marcianas conserva minerales arcillosos formados en agua neutra potable.',
    filtersUsed: 'Microscopio MAHLI a 5 cm de distancia con LEDs auxiliares',
  },
  {
    id: 'gale-vera-rubin-ridge-panorama',
    title: 'Panorama Espectacular desde Vera Rubin Ridge',
    mission: 'Curiosity',
    roverName: 'Curiosity (MSL)',
    targetRegion: 'Cráter Gale · Cresta Vera Rubin',
    sol: 1847,
    earthDate: '2017-10-25',
    camera: 'Mastcam',
    imageType: 'SURFACE_LANDSCAPE',
    imageUrl: 'data/curiosity/vera-rubin-ridge.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA22207.jpg',
    nasaCredit: 'NASA/JPL-Caltech/MSSS',
    geologicalContext: 'Escarpe de hematita cristalina sobre la planicie norte de Gale.',
    coordinates: { lon: 137.4115, lat: -4.764 },
    scienceSummary: 'Vista panorámica de 360 grados hacia el norte abarcando más de 50 kilómetros hasta el borde del cráter, demostrando la extraordinaria visibilidad diurna marciana.',
    filtersUsed: 'Mosaico cilíndrico multiespectral',
  },

  // --- JEZERO CRATER (PERSEVERANCE) - COMPARATIVE SURFACE INTELLIGENCE ---
  {
    id: 'jezero-delta-front-belva',
    title: 'Frente del Delta Antiguo y Cráter Belva',
    mission: 'Perseverance',
    roverName: 'Perseverance (Mars 2020)',
    targetRegion: 'Cráter Jezero · Frente del Delta Fluvial (ANÁLOGO PLANETARIO)',
    sol: 750,
    earthDate: '2023-03-30',
    camera: 'Mastcam-Z',
    imageType: 'SURFACE_LANDSCAPE',
    imageUrl: 'data/perseverance/jezero-delta-sol31.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA25791.jpg',
    nasaCredit: 'NASA/JPL-Caltech/ASU/MSSS',
    geologicalContext: 'Estratos de progradación deltaica en abanico aluvial lacustre.',
    coordinates: { lon: 77.452, lat: 18.384 },
    scienceSummary: 'Megabloques y cantos rodados arrastrados por inundaciones catastróficas que desembocaban en el lago Jezero. Proporciona contexto comparativo directo para el modelado de abanicos en Gale.',
    filtersUsed: 'Mosaico estéreo Mastcam-Z con zoom 110mm',
  },
  {
    id: 'jezero-abrasion-patch-skinner',
    title: 'Abrasión de Roca Skinner Ridge (Astrobiología)',
    mission: 'Perseverance',
    roverName: 'Perseverance (Mars 2020)',
    targetRegion: 'Cráter Jezero · Delta Inferior (ANÁLOGO PLANETARIO)',
    sol: 499,
    earthDate: '2022-07-16',
    camera: 'WATSON',
    imageType: 'CLOSEUP_GEOLOGY',
    imageUrl: 'data/perseverance/jezero-delta-sol52.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA25372.jpg',
    nasaCredit: 'NASA/JPL-Caltech',
    geologicalContext: 'Arenisca sedimentaria de grano fino del frente del delta.',
    coordinates: { lon: 77.441, lat: 18.379 },
    scienceSummary: 'Superficie de abrasión de 5 cm de diámetro con minerales de cuarzo y carbonatos capaces de atrapar y preservar posibles biofirmas microbianas fósiles.',
    filtersUsed: 'WATSON ultravioleta + iluminación visible de proximidad',
  },
  {
    id: 'jezero-martian-sunset',
    title: 'Puesta de Sol Marciana con Dispersión Crepuscular',
    mission: 'Perseverance',
    roverName: 'Perseverance (Mars 2020)',
    targetRegion: 'Cráter Jezero · Borde Occidental (ANÁLOGO PLANETARIO)',
    sol: 257,
    earthDate: '2021-11-09',
    camera: 'Mastcam-Z',
    imageType: 'ATMOSPHERE_SKY',
    imageUrl: 'data/perseverance/jezero-crater-rim-pia26530.jpg',
    highResUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA24933.jpg',
    nasaCredit: 'NASA/JPL-Caltech/ASU/MSSS',
    geologicalContext: 'Atmósfera marciana con carga de aerosol de polvo atmosférico fino.',
    coordinates: { lon: 77.43, lat: 18.38 },
    scienceSummary: 'Fenómeno óptico de resplandor azulado circundante al sol en el crepúsculo marciano causado por la dispersión Mie de partículas de polvo en suspensión.',
    filtersUsed: 'Filtro solar neutral Mastcam-Z',
  },
]
