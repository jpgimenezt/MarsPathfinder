/**
 * ARES MISSION COMMS - Backend Tools Specification for Amazon Nova 2.5 Sonic
 * Formato oficial para Amazon Bedrock InvokeModelWithBidirectionalStream
 * Nota: En el protocolo de streaming de Nova Sonic, inputSchema.json debe ser un string JSON serializado.
 */

export interface BedrockToolSpec {
  toolSpec: {
    name: string
    description: string
    inputSchema: {
      json: string
    }
  }
}

export const BACKEND_BEDROCK_TOOLS: BedrockToolSpec[] = [
  {
    toolSpec: {
      name: 'getCurrentMissionContext',
      description: 'Obtiene el estado en tiempo real del mapa marciano, región activa, capas y ruta trazada. / Retrieves real-time mission context, active map region, layers, and planned route.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {},
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'focusGeographicTarget',
      description: 'Mueve la cámara 3D hacia un hito o coordenadas en Marte (Mount Sharp, Jezero Delta, Bradbury Base, etc.). / Focuses 3D camera on a landmark or geographic coordinate on Mars.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            targetName: { type: 'string', description: 'Nombre del hito o destino / Name of the landmark or target (e.g. Mount Sharp, Delta Jezero, Bradbury Base)' },
            lat: { type: 'number', description: 'Latitud planetocéntrica marciana (-90 a 90) / Martian latitude' },
            lon: { type: 'number', description: 'Longitud Este marciana (-180 a 360) / Martian East longitude' },
            height: { type: 'number', description: 'Altitud o distancia de cámara / Camera distance' },
            durationSeconds: { type: 'number', description: 'Segundos de transición suave (1 a 5) / Transition seconds' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'toggleScientificLayer',
      description: 'Activa o desactiva capas orbitales científicas de NASA (ctx, mola, themis, gale_dem, geology). / Enables or disables NASA scientific orbital map layers.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            layerId: { type: 'string', description: "Identificador de la capa / Layer identifier: 'ctx', 'mola', 'themis', 'gale_dem', 'geology'" },
            enabled: { type: 'boolean', description: 'true para activar, false para desactivar / true to enable, false to disable' },
          },
          required: ['layerId', 'enabled'],
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'explainSelectedRegion',
      description: 'Consulta explicaciones geológicas y astrobiológicas fundadas en misiones de NASA para una región. / Explains geological and astrobiological context for a region based on NASA missions.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            regionName: { type: 'string', description: "Nombre de región / Region name: 'JEZERO', 'GALE', 'MOUNT_SHARP', 'BOXWORK'" },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'getMissionObservations',
      description: 'Obtiene observaciones orbitales y de superficie de NASA (Perseverance, Curiosity, CTX, HiRISE). / Retrieves orbital and surface observations from NASA missions.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitud de consulta' },
            lon: { type: 'number', description: 'Longitud de consulta' },
            region: { type: 'string', description: "Región / Region: 'GALE' or 'JEZERO'" },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'createMissionWaypoint',
      description: 'Agrega o modifica un punto de navegación (A, P o B) en la ruta actual de la misión. / Creates or updates a navigation waypoint (A, P, B).',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            stopId: { type: 'string', enum: ['A', 'P', 'B'], description: "Punto: 'A' (Base), 'P' (Parada), 'B' (Destino)" },
            lat: { type: 'number', description: 'Latitud del punto' },
            lon: { type: 'number', description: 'Longitud del punto' },
            name: { type: 'string', description: 'Nombre descriptivo del waypoint' },
          },
          required: ['stopId', 'lat', 'lon'],
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'previewEVARoute',
      description: 'Genera una previsualización de ruta y evalúa viabilidad según límites de marcha marciana. / Generates an EVA route preview and evaluates traversability limits.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['FOOT', 'ROVER'], description: 'Modo de desplazamiento / Travel mode' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'compareMissionRoutes',
      description: 'Abre el comparador de rutas para evaluar la traza de Curiosity vs la ruta actual. / Opens route comparison between Curiosity traverse and planned EVA.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            showModal: { type: 'boolean', description: 'true para mostrar el modal de comparación / true to open comparison' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'getRouteStatistics',
      description: 'Calcula distancia geodésica con radio de Marte (3,389.5 km), elevaciones y límites de marcha. / Calculates Martian geodesic distance (Rm = 3,389.5 km), elevations, and walk limits.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            includeElevation: { type: 'boolean', description: 'Incluir perfil altimétrico' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'startDiscoveryTour',
      description: 'Inicia el recorrido guiado cinematográfico por los descubrimientos científicos en Gale/Mount Sharp. / Starts the guided exploration tour across Gale / Mount Sharp scientific sites.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            startIndex: { type: 'number', description: 'Índice de parada de inicio (0 a 10) / Start stop index' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'pauseDiscoveryTour',
      description: 'Pausa o reanuda el recorrido de descubrimiento científico. / Pauses or resumes the discovery tour.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {},
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'getHabitatStatus',
      description: 'Consulta los sistemas operativos de la Base Ares Alpha (energía solar, reactores, soporte vital). / Retrieves habitat operational telemetry (power, life support, consumables).',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {},
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'activateMissionSimulation',
      description: 'Activa un escenario de simulación (descenso EDL, travesía o contingencia atmosférica). / Activates a mission simulation scenario (EDL, traverse, or contingency).',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            scenario: {
              type: 'string',
              enum: ['DESCENT_EDL', 'EVA_TRAVERSE', 'DUST_STORM_CONTINGENCY', 'EDL_DESCENT', 'SOLAR_STORM', 'TRAVERSE_EXTREME', 'DUST_STORM'],
              description: 'Escenario de simulación / Simulation scenario',
            },
            scenarioType: {
              type: 'string',
              enum: ['DESCENT_EDL', 'EVA_TRAVERSE', 'DUST_STORM_CONTINGENCY', 'EDL_DESCENT', 'SOLAR_STORM', 'TRAVERSE_EXTREME', 'DUST_STORM'],
              description: 'Alias de escenario / Scenario alias',
            },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'switchScreenView',
      description: 'Cambia entre las pantallas principales de visualización: Gale 3D ("terrain3d"), Globo Orbital ("globe") o Jezero 2D ("map"). / Switches between main view screens.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            screen: {
              type: 'string',
              enum: ['terrain3d', 'globe', 'map'],
              description: 'Identificador de la pantalla de visualización',
            },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'triggerEDLDescent',
      description: 'Inicia la maniobra cinematográfica de entrada, descenso y aterrizaje (EDL) hacia la Base LZ-1 Bradbury. / Triggers EDL descent cinematic to Base LZ-1.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {},
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'triggerOrbitAscent',
      description: 'Asciende la cámara y nave a órbita espacial alta alrededor de Marte. / Triggers orbital ascent view.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {},
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'focusBaseLZ1',
      description: 'Enfoca la cámara táctica en el sitio candidato LZ-1 Base Bradbury. / Focuses camera on LZ-1 Base Bradbury.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {},
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'triggerPanoramaColony',
      description: 'Inicia el recorrido panorámico interactivo de 360 grados por la Colonia Base Alfa. / Triggers 360 panorama tour of Base Alfa colony.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {},
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'openDataCenter',
      description: 'Abre o cierra el catálogo central de datos científicos de NASA (MOLA, CTX, THEMIS, CRISM). / Opens NASA scientific data catalog.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            open: { type: 'boolean', description: 'true para abrir, false para cerrar' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'openSurfaceIntelligence',
      description: 'Abre el panel de inteligencia de superficie marciana y objetivos geológicos. / Opens Surface Intelligence modal.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            open: { type: 'boolean', description: 'true para abrir, false para cerrar' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'setCleanViewMode',
      description: 'Activa o desactiva la pantalla completa limpia para observación pura sin paneles. / Toggles clean HUD view mode.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'true para activar pantalla limpia, false para restaurar' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'setRouteViewMode',
      description: 'Alterna o define el modo de visualización de rutas (ambas, solo eva o solo curiosity). / Sets route overlay visibility.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['both', 'eva', 'curiosity', 'toggle'], description: 'Modo de ruta' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'setTacticalDockCollapsed',
      description: 'Colapsa o expande la consola táctica de capas y controles izquierda. / Collapses or expands left tactical dock.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            collapsed: { type: 'boolean', description: 'true para colapsar, false para abrir' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'setTacticalDockTab',
      description: 'Cambia entre las pestañas de la consola táctica (Capas Científicas "layers", Cámara "camera", Base Alfa "colony"). / Sets tactical dock tab.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            tab: { type: 'string', enum: ['layers', 'camera', 'colony'], description: 'Pestaña a activar' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'openGuidedTour',
      description: 'Abre o inicia la guía interactiva paso a paso del sistema ARES. / Opens guided tour.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            open: { type: 'boolean', description: 'true para abrir' },
          },
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'triggerMissionContingency',
      description: 'Inicia un simulacro de contingencia táctica únicamente en el entorno de simulación.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            contingencyType: {
              type: 'string',
              enum: ['RADIO_LOSS', 'SUIT_LEAK_MINOR', 'BATTERY_LOW', 'SLOPE_HAZARD'],
              description: 'Tipo de contingencia de entrenamiento',
            },
          },
          required: ['contingencyType'],
        }),
      },
    },
  },

  // Herramientas originales de aws-agent
  {
    toolSpec: {
      name: 'calculate_mars_distance',
      description: 'Calcula distancia de gran círculo usando el radio de Marte Rm = 3,389.5 km.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            lat1: { type: 'number', description: 'Latitud origen' },
            lon1: { type: 'number', description: 'Longitud origen' },
            lat2: { type: 'number', description: 'Latitud destino' },
            lon2: { type: 'number', description: 'Longitud destino' },
          },
          required: ['lat1', 'lon1', 'lat2', 'lon2'],
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'lookup_mission_dataset',
      description: 'Consulta especificaciones técnicas de sensores de NASA (CTX, HiRISE, MOLA, THEMIS).',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            instrument_or_mission: { type: 'string', description: 'Nombre o acrónimo del instrumento' },
          },
          required: ['instrument_or_mission'],
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'get_science_targets',
      description: 'Obtiene puntos de alto valor geológico comprobados en Jezero o Gale/Mount Sharp.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            region: { type: 'string', description: "'JEZERO' o 'GALE_MOUNT_SHARP'" },
          },
          required: ['region'],
        }),
      },
    },
  },
  {
    toolSpec: {
      name: 'evaluate_eva_feasibility',
      description: 'Evalúa viabilidad y seguridad de caminata considerando distancia, pendientes y DEM métrico.',
      inputSchema: {
        json: JSON.stringify({
          type: 'object',
          properties: {
            total_distance_km: { type: 'number', description: 'Distancia total en km' },
            eva_mode: { type: 'string', enum: ['FOOT', 'ROVER'], description: 'Modo de caminata' },
            estimated_slope_deg: { type: 'number', description: 'Pendiente máxima estimada en grados' },
            has_meter_scale_dem: { type: 'boolean', description: 'Si cuenta con DEM métrico' },
          },
          required: ['total_distance_km', 'eva_mode'],
        }),
      },
    },
  },
]
