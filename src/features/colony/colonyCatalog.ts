/**
 * ARES — Catálogo y Arquitectura de Infraestructura Humana en Marte
 * Simulación y visualización 3D conceptual de asentamiento científico en Gale Crater (LZ-1 Bradbury Base).
 * 
 * NOTA DE TRANSPARENCIA CIENTÍFICA:
 * Toda infraestructura se identifica como CONCEPTUAL, PROPUESTA o SIMULACIÓN.
 * No constituye una instalación permanente existente ni un diseño oficial certificado por NASA.
 */

export type HabitatModuleType =
  | 'landing'
  | 'habitat'
  | 'greenhouse'
  | 'laboratory'
  | 'storage'
  | 'energy'
  | 'isru'
  | 'rover'
  | 'astronaut'
  | 'corridor'

export type ModuleCategory =
  | 'ATERRIZAJE'
  | 'HÁBITAT'
  | 'SOPORTE_VITAL'
  | 'INVESTIGACIÓN'
  | 'LOGÍSTICA'
  | 'ENERGÍA'
  | 'PROCESAMIENTO_ISRU'
  | 'MOVILIDAD'

export interface HabitatModuleConfig {
  id: string
  type: HabitatModuleType
  category: ModuleCategory
  name: string
  designation: string
  offsetMeters: {
    east: number
    north: number
  }
  rotationDeg: number
  dimensions: {
    widthMeters: number
    lengthMeters: number
    heightMeters: number
  }
  crewCapacity: number
  powerRequirementKw: number
  status: 'PROPUESTA CONCEPTUAL' | 'SIMULACIÓN DE INGENIERÍA'
  functionSummary: string
  description: string
  subsystems: string[]
  technicalReference: string
  pbrMaterials: {
    primaryColor: string
    metallic: number
    roughness: number
  }
}

/**
 * Distribución espacial predeterminada de Base Alfa en LZ-1 Bradbury Plain
 * Centro geodésico de referencia: -4.5895°S, 137.4417°E (Areoide MOLA z = -4,520 m)
 */
export const DEFAULT_COLONY_MODULES: HabitatModuleConfig[] = [
  {
    id: 'mod-landing-pad',
    type: 'landing',
    category: 'ATERRIZAJE',
    name: 'Módulo de Aterrizaje y Ascenso (HLS-Mars)',
    designation: 'VEHÍCULO DE DESCENSO TRIPULADO // LZ-1 PLATAFORMA NORTE',
    offsetMeters: { east: 35, north: 90 }, // Separación de seguridad contra pluma de retrocohetes (100 m)
    rotationDeg: 15,
    dimensions: { widthMeters: 14, lengthMeters: 14, heightMeters: 26 },
    crewCapacity: 6,
    powerRequirementKw: 25,
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Recepción inicial de tripulación, descenso desde órbita marciana y plataforma de re-ascenso con combustible de retorno metilox.',
    description:
      'Cuerpo cilíndrico de dos etapas con blindaje térmico de reingreso, 4 patas de amortiguación hidráulica, compuerta de carga pesada, rampa telescópica de descenso para rovers y grúa de manipulación de carga útil.',
    subsystems: [
      'Motores de descenso de empuje variable (Metano líquido / LOX)',
      'Tren de aterrizaje deformable con sensores de compactación de regolito',
      'Esclusa de desembarco rápido y rampa de transporte de suministros',
      'Balizas de radionavegación y telemetría de aproximación terminal',
    ],
    technicalReference:
      'Estudios de arquitectura de transporte humano a Marte (NASA Evolvable Mars Campaign / HLS)',
    pbrMaterials: {
      primaryColor: '#e2e8f0', // Aleación de aluminio-litio blanca
      metallic: 0.85,
      roughness: 0.25,
    },
  },
  {
    id: 'mod-habitat-core',
    type: 'habitat',
    category: 'HÁBITAT',
    name: 'Módulo Habitable Principal (Hab Core Alfa)',
    designation: 'ESTRUCTURA HABITACIONAL PRESURIZADA DE DOS NIVELES',
    offsetMeters: { east: 0, north: 0 }, // Centro del asentamiento
    rotationDeg: 0,
    dimensions: { widthMeters: 12, lengthMeters: 12, heightMeters: 8.5 },
    crewCapacity: 6,
    powerRequirementKw: 18,
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Alojamiento, descanso, estación de control de misión, enfermería médica, gimnasio de contramedidas óseas y centro social.',
    description:
      'Estructura híbrida semirrígida con cúpula inflable de múltiples capas protegida por un domo exterior de regolito compactado para blindaje contra radiación cósmica galáctica (GCR). Conectada directamente a los demás módulos mediante túneles presurizados.',
    subsystems: [
      'Sistema de Control Ambiental y Soporte de Vida (ECLSS redundante a 101.3 kPa, 21% O2)',
      'Blindaje de polietileno rico en hidrógeno y manto exterior de regolito de 1.5 m',
      'Consola de monitoreo de signos vitales y telemetría de trajes EVA',
      'Cúpula de observación técnica con compuerta de protección contra tormentas de polvo',
    ],
    technicalReference:
      'NASA Mars Design Reference Architecture 5.0 (DRA 5.0) / Langley Research Center Mars Ice Home',
    pbrMaterials: {
      primaryColor: '#f8fafc',
      metallic: 0.2,
      roughness: 0.5,
    },
  },
  {
    id: 'mod-greenhouse-celss',
    type: 'greenhouse',
    category: 'SOPORTE_VITAL',
    name: 'Invernadero Bioregenerativo (CELSS Bio-Dome)',
    designation: 'CÁMARA DE CULTIVO HIDROPÓNICO Y SOPORTE VITAL CERRADO',
    offsetMeters: { east: 26, north: -12 },
    rotationDeg: 30,
    dimensions: { widthMeters: 9, lengthMeters: 16, heightMeters: 5.5 },
    crewCapacity: 2,
    powerRequirementKw: 32, // Alta demanda lumínica LED fotosintética
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Producción de biomasa vegetal fresca (patatas, verduras de hoja, leguminosas), absorción de CO2 residual y producción biológica de oxígeno.',
    description:
      'Estructura abovedada translúcida de fluoropolímero ETFE de triple capa con atenuador de radiación ultravioleta. En su interior alberga bastidores hidropónicos verticales rotativos, iluminación LED fotosintética calibrada a 450/660 nm y reciclaje de humedad transpirada.',
    subsystems: [
      'Circuito cerrado de nutrientes hidropónicos y purificación biológica de agua',
      'Iluminación de espectro ajustado para optimización de clorofila A/B',
      'Monitoreo atmosférico de etileno, humedad relativa y CO2 enriquecido',
      'Esclusa presurizada de conexión con el módulo habitacional principal',
    ],
    technicalReference:
      'Investigación de soporte vital bioregenerativo (NASA Kennedy Space Center Vegetable Production System)',
    pbrMaterials: {
      primaryColor: '#67e8f9', // Vidrio técnico translúcido
      metallic: 0.1,
      roughness: 0.1,
    },
  },
  {
    id: 'mod-science-lab',
    type: 'laboratory',
    category: 'INVESTIGACIÓN',
    name: 'Laboratorio de Geología y Astrobiología',
    designation: 'CENTRO CIENTÍFICO DE ANÁLISIS DE MUESTRAS MARCIANAS',
    offsetMeters: { east: -24, north: -10 },
    rotationDeg: -20,
    dimensions: { widthMeters: 10, lengthMeters: 14, heightMeters: 6.0 },
    crewCapacity: 4,
    powerRequirementKw: 15,
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Análisis in-situ de testigos de roca, búsqueda de posibles biofirmas fósiles en sedimentos de Gale, preparación de muestras y enlace con Curiosity/Perseverance.',
    description:
      'Módulo presurizado equipado con cabinas de aislamiento biológico nivel BSL-4, espectrómetros de masas, difractómetro de rayos X similar a CheMin, microscopio electrónico de barrido y guantera de manipulación de regolito en atmósfera inerte de nitrógeno.',
    subsystems: [
      'Cabina aislada de contención de muestras de superficie con presión negativa',
      'Microscopía confocal y espectrometría Raman/LIBS de alta resolución',
      'Banco de purificación y datación isotópica de fluidos hidrotermales fósiles',
      'Antena de comunicaciones parabólica de alta ganancia (Banda Ka a red DSN)',
    ],
    technicalReference:
      'Directrices de Protección Planetaria y Laboratorios de Contención de Muestras (NASA / COSPAR)',
    pbrMaterials: {
      primaryColor: '#e2e8f0',
      metallic: 0.75,
      roughness: 0.35,
    },
  },
  {
    id: 'mod-eva-storage',
    type: 'storage',
    category: 'LOGÍSTICA',
    name: 'Módulo Logístico y Esclusa de Actividades EVA',
    designation: 'TERMINAL DE TRAJES ESPACIALES Y PREPARACIÓN DE CAMINATAS',
    offsetMeters: { east: -2, north: -22 },
    rotationDeg: 180,
    dimensions: { widthMeters: 8, lengthMeters: 10, heightMeters: 5.0 },
    crewCapacity: 4,
    powerRequirementKw: 8,
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Almacenamiento y recarga de trajes mEMU, despresurización de esclusa, mitigación de polvo electrostático y almacén de repuestos.',
    description:
      'Módulo de transición hacia el exterior marciano equipado con esclusa suitport que permite acceder a los trajes desde el exterior para evitar que el polvo tóxico y abrasivo de regolito penetre en las zonas presurizadas del hábitat.',
    subsystems: [
      'Suitports exteriores acoplables para dos trajes de superficie mEMU',
      'Ducha de aire ionizado y trampas magnéticas de polvo de regolito',
      'Estación de recarga de consumibles de mochila PLSS (oxígeno a 200 bar, agua de sublimación y baterías)',
      'Banco de trabajo exterior y herramientas geológicas de martillo, taladro y palas',
    ],
    technicalReference:
      'NASA Exploration Extravehicular Activity (xEVA) / Constellation Suitport Concepts',
    pbrMaterials: {
      primaryColor: '#cbd5e1',
      metallic: 0.6,
      roughness: 0.4,
    },
  },
  {
    id: 'mod-solar-array-farm',
    type: 'energy',
    category: 'ENERGÍA',
    name: 'Granja Solar Fotovoltaica Articulada',
    designation: 'CAMPO DE PANELES ULTRA-FLEX Y SUBESTACIÓN DE BATERÍAS',
    offsetMeters: { east: -65, north: 25 },
    rotationDeg: 45,
    dimensions: { widthMeters: 38, lengthMeters: 18, heightMeters: 4.2 },
    crewCapacity: 0,
    powerRequirementKw: -120, // Generador neto de 120 kW en solsticio
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Generación fotovoltaica principal para soporte de vida, iluminación de invernadero y carga de rovers durante el día marciano.',
    description:
      'Arreglo de 6 paneles solares desplegables de arseniuro de galio de triple unión con seguimiento automático de acimut y elevación del Sol, acoplados a un sistema de limpieza electrostática de polvo y bancos de baterías de estado sólido.',
    subsystems: [
      'Células solares espaciales GaAs de alta eficiencia (rendimiento ~32%)',
      'Escudo electrodinámico de eliminación de polvo eólico (EDS)',
      'Baterías de litio-azufre enterradas para regulación térmica nocturna (capacidad 400 kWh)',
      'Líneas superconductoras presurizadas hacia la subestación central',
    ],
    technicalReference:
      'Sistemas de Potencia de Superficie para Misiones Tripuladas a Marte (NASA Glenn Research Center)',
    pbrMaterials: {
      primaryColor: '#1e3a8a', // Azul oscuro de silicio / GaAs
      metallic: 0.9,
      roughness: 0.15,
    },
  },
  {
    id: 'mod-isru-processing',
    type: 'isru',
    category: 'PROCESAMIENTO_ISRU',
    name: 'Planta Piloto de Recursos In-Situ (ISRU Alfa)',
    designation: 'UNIDAD DE ELECTRÓLISIS DE CO2 Y OBTENCIÓN DE OXÍGENO',
    offsetMeters: { east: 55, north: 45 },
    rotationDeg: -60,
    dimensions: { widthMeters: 10, lengthMeters: 12, heightMeters: 6.5 },
    crewCapacity: 0,
    powerRequirementKw: 45,
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Captura de la atmósfera marciana (95% CO2) y electrólisis a alta temperatura (SOXE) para producir oxígeno líquido para respiración y propelente.',
    description:
      'Instalación industrial autónoma basada en la tecnología demostrada por MOXIE en el rover Perseverance, pero escalada a nivel de misión humana para producir 2.5 kg de O2 por hora. Incluye tanques criogénicos de almacenamiento de oxígeno líquido a 90 K.',
    subsystems: [
      'Compresor criogénico de atmósfera marciana y purificador de polvo',
      'Pila de electrólisis de óxido sólido (SOXE a 800°C)',
      'Licuefactor de O2 y tanque criogénico esférico aislado al vacío',
      'Conexión de combustible hacia el Módulo de Aterrizaje y Ascenso (HLS)',
    ],
    technicalReference:
      'Experimento MOXIE (Mars 2020) escalado a producción de propelente in-situ (NASA / MIT)',
    pbrMaterials: {
      primaryColor: '#f59e0b', // Aislamiento térmico dorado / ámbar
      metallic: 0.95,
      roughness: 0.18,
    },
  },
  {
    id: 'mod-pressurized-rover',
    type: 'rover',
    category: 'MOVILIDAD',
    name: 'Rover de Exploración Presurizada (ARES Rover-1)',
    designation: 'VEHÍCULO TRIPULADO DE LARGO ALCANCE (AUTONOMÍA 120 KM)',
    offsetMeters: { east: -14, north: -32 },
    rotationDeg: 125,
    dimensions: { widthMeters: 4.5, lengthMeters: 7.2, heightMeters: 3.8 },
    crewCapacity: 2,
    powerRequirementKw: 12,
    status: 'PROPUESTA CONCEPTUAL',
    functionSummary:
      'Transporte con soporte de vida en mangas de camisa hacia objetivos científicos distantes (Pontours, Vera Rubin Ridge y base de Mount Sharp).',
    description:
      'Vehículo de 6 ruedas independientes con suspensión oscilante tipo rocker-bogie, cabina presurizada a 55 kPa, suitports traseros para acceso directo a trajes espaciales y brazo robótico equipado con taladro y cámara de microscopía.',
    subsystems: [
      'Motores eléctricos en las ruedas con tracción total 6x6 y dirección independiente',
      'Cabina con soporte vital para 14 días de autonomía expedicionaria',
      'Radar de penetración de regolito (GPR) para detección de cavidades subsuperficiales',
      'Suitports traseros de acoplamiento rápido para dos astronautas',
    ],
    technicalReference:
      'NASA Multi-Mission Space Exploration Vehicle (MMSEV) / Chariot Rover Concepts',
    pbrMaterials: {
      primaryColor: '#e2e8f0',
      metallic: 0.8,
      roughness: 0.3,
    },
  },
]
