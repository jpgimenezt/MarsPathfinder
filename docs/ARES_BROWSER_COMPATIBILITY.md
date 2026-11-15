# ARES MISSION COMMS — Matriz de Compatibilidad Multiplataforma y Navegadores

> **Evaluación de Compatibilidad en macOS, Windows y Linux // Chrome, Edge, Safari y Firefox**  
> **NASA Space Apps Challenge 2026 // ARES Voice Engine**

---

## 1. Matriz de Compatibilidad por Navegador

| Plataforma / Navegador | Captura (`getUserMedia`) | Web Audio API / RMS | Downsampler 16kHz | Wake Word Automático | Streaming Nova Sonic | Fallback Push-to-Talk |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **macOS — Google Chrome** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ✅ Fonético + VAD | ✅ WebSocket 16k/24k | ✅ Disponible |
| **macOS — Apple Safari** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ✅ Fonético + VAD | ✅ WebSocket 16k/24k | ✅ Disponible |
| **macOS — Microsoft Edge** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ✅ Fonético + VAD | ✅ WebSocket 16k/24k | ✅ Disponible |
| **macOS — Mozilla Firefox** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ⚠️ PTT / Flag | ✅ WebSocket 16k/24k | ✅ Nativo |
| **Windows 11 — Chrome / Edge** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ✅ Fonético + VAD | ✅ WebSocket 16k/24k | ✅ Disponible |
| **Windows 11 — Firefox** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ⚠️ PTT / Flag | ✅ WebSocket 16k/24k | ✅ Nativo |
| **Linux (Ubuntu) — Chromium** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ✅ Fonético + VAD | ✅ WebSocket 16k/24k | ✅ Disponible |
| **Linux (Ubuntu) — Firefox** | ✅ Nativo | ✅ Nativo (60 FPS) | ✅ AudioWorklet | ⚠️ PTT / Flag | ✅ WebSocket 16k/24k | ✅ Nativo |

---

## 2. Análisis Detallado por Componente

### A. Captura Unificada de Micrófono (`AudioCaptureService`)
- Compatible al 100% en todos los navegadores modernos mediante `navigator.mediaDevices.getUserMedia()`.
- Soporta negociación automática de frecuencias nativas de hardware (44.1 kHz en la mayoría de laptops Windows, 48 kHz en macOS y tarjetas profesionales).
- El downsampling hacia 16 kHz mono para Amazon Nova 2.5 Sonic se realiza de forma transparente dentro del pipeline Web Audio.

### B. Cálculo en Tiempo Real de RMS, Peak y Telemetría
- `AnalyserNode.getFloatTimeDomainData()` es el estándar primario utilizado para capturar la forma de onda sin cuantización.
- En navegadores antiguos o entornos con limitaciones, `AudioCaptureService` conmuta automáticamente a `getByteTimeDomainData()` sin interrumpir la señal ni arrojar errores.

### C. Detección de Wake Word ("Hola, ARES" / "Hey, ARES")
1. **Navegadores Chromium (Chrome, Edge, Brave, Opera) y Safari:**  
   Soportan `webkitSpeechRecognition` nativo en background continuo acoplado al detector VAD acústico de `AudioCaptureService`.
2. **Mozilla Firefox:**  
   Históricamente mantiene la API `SpeechRecognition` detrás de la preferencia interna `media.webspeech.recognition.enable` en `about:config`. Para garantizar una experiencia de usuario perfecta sin obligar al usuario a modificar configuraciones del navegador:
   - ARES activa inmediatamente el modo **Push-to-Talk (PTT)** táctico.
   - El botón `[🎤 HABLAR]` y el orbe permiten interactuar directamente.
   - El streaming continuo a Amazon Nova 2.5 Sonic funciona con la misma velocidad y fidelidad que en Chrome.

---

## 3. Evaluación Técnica de Picovoice Porcupine Web

Conforme al mandato de investigación técnica del desafío:
- **Requisitos de Porcupine Web:**
  - Exige una clave de acceso personal (`AccessKey`) obtenida mediante registro en Picovoice Console.
  - El reconocimiento de frases personalizadas en español (*"Hola, ARES"*) o inglés (*"Hey, ARES"*) requiere entrenar un modelo específico (`.ppn`) y cargarlo como asset binario WebAssembly.
  - La versión gratuita de Picovoice tiene límites de dispositivos mensuales y restricciones de términos de servicio para software abierto.
- **Decisión de Arquitectura en ARES:**
  - El sistema implementa un motor acústico y fonético universal nativo sin dependencias de claves externas de pago.
  - La arquitectura deja expuesta la interfaz para inyectar Porcupine Web si el operador suministra la variable de entorno `VITE_PICOVOICE_ACCESS_KEY`.
  - Sin dicha variable, el sistema opera de forma 100% autónoma y funcional en cualquier equipo.
