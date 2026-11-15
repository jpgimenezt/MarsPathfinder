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
            scenarioType: {
              type: 'string',
              enum: ['EDL_DESCENT', 'SOLAR_STORM', 'TRAVERSE_EXTREME', 'DUST_STORM'],
              description: 'Tipo de simulación',
            },
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
