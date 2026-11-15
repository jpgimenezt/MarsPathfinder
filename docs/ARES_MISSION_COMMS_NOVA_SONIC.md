# ARES MISSION COMMS — Real-Time Voice AI Copilot
## Integración Oficial con Amazon Nova 2.5 Sonic (Amazon Bedrock Runtime)
**NASA Space Apps Challenge 2026: Interplanetary Survival Guide — Martian Map**

---

## 1. Visión y Misión del Copiloto

**ARES** (*Advanced Rover & Exploration System*) no es un chatbot decorativo. Es el **copiloto inteligente de misión para exploraciones humanas en Marte (EVA / Marswalk)**.

El sistema escucha activamente las instrucciones del astronauta mediante captura de micrófono en streaming, procesa el habla con **Amazon Nova 2.5 Sonic** a través de la API `InvokeModelWithBidirectionalStream` de Amazon Bedrock, sintetiza respuestas habladas naturales en español con baja latencia, mantiene el contexto espacial y científico de la misión, y **ejecuta acciones operacionales reales** sobre el relieve marciano 3D, las capas orbitales de NASA y el trazado de rutas.

```text
                               +--------------------------------------------+
                               |     ASTRONAUTA EN MARTE (Navegador Web)    |
                               |  - Web Audio API (AudioWorklet 16kHz PCM)  |
                               |  - Analizador FFT Dinámico de Frecuencias  |
                               |  - Transcripción y Controles PTT/Hands-Free|
                               +---------------------+----------------------+
                                                     |
                                        (WebSocket Seguro Bidireccional)
                                                     v
                               +--------------------------------------------+
                               |        ARES VOICE GATEWAY (Node.js)        |
                               |  - Gestión de sesión y ciclo de vida       |
                               |  - Buffer progresivo de entrada / salida   |
                               |  - Router de herramientas tipadas (Zod)    |
                               |  - IAM Role con mínimos privilegios        |
                               +---------------------+----------------------+
                                                     |
                             (HTTP/2 Bidirectional Event Stream: SigV4)
                                                     v
                               +--------------------------------------------+
                               |         AMAZON BEDROCK RUNTIME             |
                               |       Modelo: amazon.nova-2-5-sonic        |
                               |       Región: us-west-2 / us-east-1        |
                               |  - Speech-to-Speech bidireccional nativo   |
                               |  - Detección de turnos e interrupciones    |
                               |  - Tool Use (Invocación estructurada)      |
                               +---------------------+----------------------+
                                                     |
                          +--------------------------+--------------------------+
                          v                                                     v
          +-------------------------------+                     +-------------------------------+
          |  Herramientas de Visualización|                     |  Servicios Científicos NASA   |
          |  * focusGeographicTarget      |                     |  * calculate_mars_distance    |
          |  * toggleScientificLayer      |                     |  * lookup_mission_dataset     |
          |  * createMissionWaypoint      |                     |  * get_science_targets        |
          |  * startDiscoveryTour         |                     |  * evaluate_eva_feasibility   |
          +-------------------------------+                     +-------------------------------+
```

---

## 2. Especificaciones de Audio y Streaming

| Parámetro | Entrada (Micrófono Astronauta) | Salida (Voz Copiloto ARES) |
|---|---|---|
| **Formato** | Linear PCM 16-bit Mono (`audio/lpcm`) | Linear PCM 16-bit Mono (`audio/lpcm`) |
| **Frecuencia de Muestreo** | **16,000 Hz** (16 kHz) | **24,000 Hz** (24 kHz) |
| **Procesador Frontend** | Web Audio API + `AudioWorkletNode` | `AudioBufferSourceNode` progresivo |
| **Tamaño de Frame** | Chunks de 100 ms (~3,200 bytes base64) | Streaming continuo de chunks |
| **Voces Soportadas** | N/A (Captura micrófono) | `carlos` (Español neutro), `lupe` (Español) |
| **Latencia** | Streaming inmediato sin esperar turnos | Reproducción bufferizada en tiempo real |
| **Interrupción (*Barge-in*)** | Detección automática en servidor y botón instantáneo | Cancelación de audio en curso y vaciado de cola |

---

## 3. Identidad y Reglas Científicas No Negociables

1. **Nombre:** ARES (*Advanced Rover & Exploration System*), AI MISSION COPILOT.
2. **Idioma:** Español con terminología aeroespacial precisa, sobria y concisa.
3. **Geodesia Marciana Estricta:** Radio medio de Marte $R_M = 3,389.5\text{ km}$ ($3,389,500\text{ m}$). **Prohibido utilizar el radio terrestre** (~6,371 km).
4. **Límites de Marcha (Walkback Limit):**
   - Límite nominal a pie: **5.0 km** de radio respecto al hábitat/rover.
   - Límite de contingencia extrema: **8.0 km**.
   - Pendientes de terreno:
     - $< 8^\circ$: Nominal (tránsito seguro).
     - $8^\circ - 15^\circ$: Moderada (+50% consumo metabólico).
     - $15^\circ - 20^\circ$: Difícil (resbalamiento en regolito fino).
     - $> 20^\circ$: **NO-GO** para marcha a pie estándar.
5. **Honestidad Epistémica:** Distinción obligatoria entre:
   - `[OBSERVED]`: Datos reales de sensores (CTX, HiRISE, THEMIS, Mastcam-Z).
   - `[DERIVED]`: Modelos de elevación procesados (DEM Gale).
   - `[SIMULATED]`: Instalaciones conceptuales de base o simulacros de entrenamiento.
   - `[UNAVAILABLE]`: Ausencia de DEM métrico local (ej. detección de rocas submétricas en Jezero).

---

## 4. Matriz de Herramientas y Niveles de Seguridad

El sistema implementa 14 herramientas operacionales y 4 herramientas científicas heredadas, clasificadas en **4 niveles de impacto**:

| Nivel de Seguridad | Descripción | Validación | Requiere Confirmación | Herramientas |
|---|---|---|---|---|
| **Nivel 1 — Consulta** | Lectura de telemetría y explicaciones científicas | Esquema Zod | No (Inmediata) | `getCurrentMissionContext`, `explainSelectedRegion`, `getMissionObservations`, `getRouteStatistics`, `getHabitatStatus`, `calculate_mars_distance`, `lookup_mission_dataset`, `get_science_targets`, `evaluate_eva_feasibility` |
| **Nivel 2 — Visualización** | Movimientos de cámara 3D, alternar capas y modales | Esquema Zod | No (Inmediata) | `focusGeographicTarget`, `toggleScientificLayer`, `previewEVARoute`, `compareMissionRoutes`, `pauseDiscoveryTour` |
| **Nivel 3 — Modificación** | Modificación de rutas y fijación de waypoints | Esquema Zod | **Sí (Diálogo táctico)** | `createMissionWaypoint` |
| **Nivel 4 — Simulación** | Inicio de recorridos cinematográficos y contingencias | Esquema Zod | **Sí (Diálogo táctico)** | `startDiscoveryTour`, `activateMissionSimulation`, `triggerMissionContingency` |

---

## 5. Estados del Sistema en la Interfaz

La consola visual `ARES MISSION COMMS` refleja el estado real del enlace:

- `VOICE_OFFLINE`: Canal en espera. Presionar `INICIAR ENLACE` para activar.
- `CONNECTING`: Estableciendo canal WebSocket y stream HTTP/2 con Bedrock.
- `LISTENING`: Micrófono activo escuchando al astronauta (PTT o Manos Libres).
- `PROCESSING`: Turno de usuario completado; el modelo procesa la intención.
- `SPEAKING`: Nova Sonic transmite audio de voz sintetizada en tiempo real.
- `TOOL_EXECUTION`: Ejecutando acción en el mapa o consultando datos científicos.
- `RECONNECTING`: Reconexión automática con recuperación de contexto.
- `ERROR`: Falla de red, permiso de micrófono denegado o error del servicio.

---

## 6. Guion de Demostración Operativa (Fase 14)

### Secuencia Paso a Paso:

1. **Apertura de la consola:**
   - Hacer clic en el botón flotante HUD **`MISSION COMMS`** o en el botón del encabezado **`VOZ: MISSION COMMS`**.
2. **Iniciar Enlace:**
   - Presionar `INICIAR ENLACE`. El badge cambia a `LISTENING` con aura cian.
3. **Consulta Científica:**
   - **Astronauta (Voz o PTT):** *"ARES, ¿qué características geológicas tiene esta región?"*
   - **ARES (Voz y Transcripción en tiempo real):** *"Estamos observando las crestas boxwork del Monte Sharp en el Cráter Gale. Son redes minerales de fractura subterránea que evidencian circulación hidrotermal antigua con alto potencial de habitabilidad protegida de la radiación."*
4. **Comando de Cámara 3D (Nivel 2):**
   - **Astronauta:** *"Enfocá Mount Sharp."*
   - **ARES:** *"Entendido. Reorientando cámara táctica hacia Mount Sharp."* (La cámara 3D realiza un desplazamiento suave hacia las coordenadas $[-4.68^\circ, 137.40^\circ]$).
5. **Activación de Capas (Nivel 2):**
   - **Astronauta:** *"Mostrame las capas geológicas."*
   - **ARES:** Invoca `toggleScientificLayer({ layerId: "geology", enabled: true })` y activa la textura geológica multiespectral en 3D.
6. **Consulta de Observaciones Multimisión (Nivel 1):**
   - **Astronauta:** *"Mostrame las observaciones de Curiosity."*
   - **ARES:** Invoca `getMissionObservations` y despliega el Centro de Datos Científicos con fichas verificadas de CTX, HiRISE y Mastcam.
7. **Modificación de Ruta con Confirmación de Seguridad (Nivel 3):**
   - **Astronauta:** *"Establecé una parada científica en las coordenadas latitud menos cuatro punto sesenta y ocho, longitud ciento treinta y siete punto cuarenta."*
   - **ARES:** Genera la tarjeta de seguridad: `[CONFIRMACIÓN TÁCTICA // NIVEL 3] ¿Confirmar fijar el punto P en [-4.6800°N, 137.4000°E]?`
   - El astronauta presiona `[CONFIRMAR OPERACIÓN]` y el waypoint aparece en la ruta 3D y 2D calculando la nueva distancia con $R_M = 3,389.5\text{ km}$.

---

## 7. Instrucciones de Ejecución

### Desarrollo Local:

```bash
# 1. En una terminal, iniciar el Voice Gateway de Nova Sonic:
npm run voice:gateway

# 2. En otra terminal, iniciar la aplicación web Vite:
npm run dev

# 3. Abrir http://localhost:5173 en Chrome/Firefox y presionar 'MISSION COMMS'
```

### Ejecución de Pruebas Unitarias y Tipado:

```bash
# Ejecutar los 83 tests de verificación (incluyendo geodesia, contexto, herramientas y audio):
npm test

# Verificación de TypeScript estricto:
npm run typecheck

# Compilación de producción:
npm run build
```

---

## 8. Despliegue en la Nube (AWS ECS Fargate)

Para producción con alta disponibilidad y streaming bidireccional de larga duración:

1. **Construir imagen Docker:**
   ```bash
   docker build -t ares-voice-gateway -f voice-gateway/Dockerfile .
   ```
2. **Subir a Amazon ECR:**
   ```bash
   aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 306538367011.dkr.ecr.us-east-2.amazonaws.com
   docker tag ares-voice-gateway:latest 306538367011.dkr.ecr.us-east-2.amazonaws.com/ares-voice-gateway:latest
   docker push 306538367011.dkr.ecr.us-east-2.amazonaws.com/ares-voice-gateway:latest
   ```
3. **Registrar Task Definition:**
   ```bash
   aws ecs register-task-definition --cli-input-json file://voice-gateway/task-definition.json
   ```
4. **Crear Servicio ECS Fargate con Application Load Balancer** habilitando WebSockets persistentes (timeout de 900 segundos).
