# ARES MISSION COMMS — Arquitectura Universal de Audio y Procesamiento Acústico

> **Sistema Táctico de Comunicaciones de Voz y Streaming Bidireccional para Misiones de Exploración en Marte**  
> **NASA Space Apps Challenge 2026 // Prototipo de Investigación y Operaciones Humanas de Superficie**

---

## 1. Visión y Principios Rectores

ARES MISSION COMMS implementa una arquitectura desacoplada de audio basada en **estándares abiertos de la Web (Web Audio API, AudioWorklet, MediaStream)** diseñada para funcionar de forma consistente en navegadores modernos (Chrome, Safari, Edge, Firefox) sobre macOS, Windows y Linux.

### Principios Fundamentales:
1. **Captura Unificada y Único Propietario (`AudioCaptureService`):**  
   Una única instancia (`Singleton`) es la propietaria del acceso al micrófono mediante `navigator.mediaDevices.getUserMedia()`. Ningún componente secundario abre streams paralelos ni duplica el acceso al hardware.
2. **Reacción Acústica Real (Zero Faking):**  
   Ni el orbe holográfico ni el osciloscopio de telemetría utilizan animaciones decorativas o simulación de audio. Cada milisegundo de movimiento proviene del cálculo exacto del **RMS** ($\sqrt{\frac{1}{N}\sum x_i^2}$), **Peak** y **VAD (Voice Activity Detection)** sobre el buffer acústico real.
3. **Desacoplamiento en Seis Capas:**  
   La captura, el procesamiento de señal, la detección de activación, la comprensión conversacional, la ejecución de herramientas de misión y la visualización están estrictamente desacopladas mediante interfaces TypeScript y patrones pub/sub.
4. **Resiliencia Multiplataforma:**  
   Si `AudioWorklet` o `SpeechRecognition` no están disponibles en un entorno específico (por ejemplo, restricciones de sandbox o navegadores sin Web Speech), el sistema conmuta automáticamente a `ScriptProcessorNode` y modo **Push-to-Talk**, manteniendo intacto el streaming hacia Amazon Nova 2.5 Sonic.

---

## 2. Diagrama de las Seis Capas de Audio

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA 1: AUDIO CAPTURE                           │
│        navigator.mediaDevices.getUserMedia({ audio: { ... } })        │
│          MediaStreamTrack (Echo Cancellation + Noise Suppression)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       CAPA 2: AUDIO PROCESSING                         │
│                    AudioCaptureService (Singleton)                     │
│                                                                        │
│   ┌────────────────────────┐         ┌──────────────────────────────┐ │
│   │    AnalyserNode        │         │   AudioWorklet / Fallback    │ │
│   │  getFloatTimeDomain()  │         │   PcmDownsampler (16kHz)     │ │
│   │  RMS / Peak / dBFS / VAD│         │   Linear PCM 16-bit Mono     │ │
│   └───────────┬────────────┘         └──────────────┬───────────────┘ │
└───────────────┼─────────────────────────────────────┼─────────────────┘
                │ (Telemetría Acústica 60 FPS)        │ (PCM 16kHz Chunks)
        ┌───────┴───────────────┐                     │
        │                       │                     │
┌───────▼──────────────┐ ┌──────▼──────────────┐ ┌────▼─────────────────┐
│       CAPA 3:        │ │       CAPA 6:       │ │       CAPA 4:        │
│ WAKE WORD DETECTION  │ │ AUDIO VISUALIZATION │ │ VOICE UNDERSTANDING  │
│ Local Wake Engine    │ │ Ares Reactive Orb   │ │ Amazon Nova 2.5      │
│ - Hey ARES / Hola ARES│ │ Telemetry Waveform  │ │ Sonic (Bedrock WS)   │
│ - Phonetic Clipping  │ │ Diagnostics Panel   │ │ - Full Turn Context  │
│ - Anti-Echo Lock     │ │ Real-Time FFT Bars  │ │ - Streaming S2S      │
└───────────────┬──────┘ └─────────────────────┘ └──────────┬───────────┘
                │ (Comandos hablados)                       │ (Tool Calls)
                └───────────────────────┬───────────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │           CAPA 5:           │
                         │      APPLICATION ACTIONS    │
                         │ ToolExecutionEngine         │
                         │ - toggleScientificLayer     │
                         │ - flyToMarsLocation         │
                         │ - planEvaRoute / compare    │
                         └─────────────────────────────┘
```

---

## 3. Especificación Técnica de las Capas

### Capa 1: Audio Capture (`getUserMedia`)
- **Restricciones Solicitadas:** Mono (`channelCount: 1`), `sampleRate: 16000`, `echoCancellation: true`, `noiseSuppression: true`, `autoGainControl: true`.
- **Gestión de Ciclo de Vida:** Si el usuario minimiza el panel de misión, cambia de pestaña o expande el mapa 3D, el stream **permanece activo**. La captura solo se detiene cuando el usuario se desconecta explícitamente o silencia el micrófono.

### Capa 2: Audio Processing (`AudioCaptureService`)
- **Cálculo de RMS (Root Mean Square):**
  $$\text{RMS} = \sqrt{\frac{1}{N} \sum_{i=0}^{N-1} x_i^2}$$
  Calculado a partir de muestras normalizadas $[-1.0, 1.0]$.
- **Peak Amplitude:**
  $$\text{Peak} = \max_{0 \le i < N} |x_i|$$
- **Nivel en Decibelios (dBFS):**
  $$\text{dBFS} = 20 \log_{10}(\max(\text{RMS}, 10^{-5}))$$
- **Voice Activity Detection (VAD):** Umbral adaptativo a $0.02$ con histeresis acústica para evitar disparos en falso por ruido de fondo.
- **Formato PCM:** Generación de paquetes `Int16Array` lineales a 16.000 Hz mediante `AudioWorkletNode` registrado en memoria vía `Blob/URL.createObjectURL`. Si el navegador restringe los worklets, conmuta a `ScriptProcessorNode` de 2048 muestras.

### Capa 3: Wake Word Detection
- Frases admitidas: `"Hola, ARES"` (español) y `"Hey, ARES"` (inglés).
- Tolerancia a truncamientos fonéticos iniciales: reconoce `"res"`, `"eiares"`, `"eyares"` cuando el hardware o el navegador recortan el ataque de la consonante.
- Extracción de *Trailing Commands*: Si el astronauta dice `"Hola ARES enfoca Mount Sharp"`, el sistema activa la sesión y ejecuta el comando contiguo en el mismo turno, sin exigir una segunda pulsación ni pausa obligada.
- **Anti-Echo Speaking Guard:** Bloqueo acústico temporal mientras el asistente habla + 800 ms de margen de gracia. Permite interrupciones deliberadas (*Barge-In*: *"detener"*, *"para"*, *"silencio"*).

### Capa 4: Voice Understanding (`Amazon Nova 2.5 Sonic`)
- Conexión por WebSocket streaming con el backend `voice-gateway` (`ws://localhost:8088/voice`).
- Protocolo Speech-to-Speech bidireccional de baja latencia con voz natural multilingüe.
- Recepción de audio sintetizado a 24.000 Hz, resampleado limpiamente por Web Audio API sin aceleración ni alteración tonal.

### Capa 5: Application Actions (`ToolExecutionEngine`)
- Despacho y retorno estricto de herramientas: cada `toolUse` genera una llamada a la aplicación y retorna un `toolResult` estructurado a Nova Sonic, preservando el contexto conversacional.
- Integración directa con el mapa 3D de Gale Crater, capas orbitales (CTX, THEMIS, MOLA), geología USGS y planificación de ruta EVA.

### Capa 6: Audio Visualization (`Ares Voice Visualizer`)
- **Orbe Reactivo:** Escala (`transform: scale(...)`), resplandor (`box-shadow`) y rotación orbital calculados directamente del RMS en tiempo real a 60 FPS.
- **Osciloscopio FUI:** Dibujado en `<canvas>` mediante `requestAnimationFrame`, reflejando la forma de onda acústica en cobre marciano (`#E87A5D`) para el usuario y cyan espacial (`#63D4E5`) para ARES.
