# ARES MISSION COMMS — Panel de Diagnóstico Acústico (Audio Diagnostics)

> **Manual de Diagnóstico de Señales, Telemetría Acústica y Solución de Problemas**  
> **NASA Space Apps Challenge 2026 // ARES Voice Engine**

---

## 1. Acceso a la Telemetría de Audio

El panel de diagnóstico **ARES AUDIO DIAGNOSTICS** está disponible directamente en la consola de comunicaciones:

1. Abrir la consola de comunicaciones ARES (clic en el orbe o en el botón del copiloto).
2. En la barra superior, junto al selector de idioma (`[🌐 EN / 🇦🇷 ES]`), pulsar el botón **`[📊 DIAG]`**.
3. Se desplegará la tarjeta técnica con la telemetría acústica en vivo a 60 FPS.

---

## 2. Métricas y Parámetros Supervisados

| Métrica | Descripción Técnica | Rango Esperado |
|---|---|---|
| **Dispositivo** | Nombre del micrófono de hardware detectado por `MediaDeviceInfo.label`. | Ej. *"MacBook Pro Microphone"*, *"AirPods"*, *"USB Headset"*. |
| **Permiso** | Estado devuelto por `navigator.permissions.query({ name: 'microphone' })`. | `GRANTED`, `PROMPT`, `DENIED`. |
| **AudioContext** | Estado del motor de procesamiento Web Audio API y frecuencia de muestreo. | `running` (16.000 Hz, 44.100 Hz o 48.000 Hz). |
| **Procesador** | Mecanismo de downsampling a PCM 16-bit mono. | `AudioWorklet (16kHz)` o `ScriptProcessor Fallback`. |
| **RMS Actual** | Valor cuadrático medio de las muestras normalizadas ($x \in [-1, 1]$). | `0.0000` (silencio) a `0.3500+` (voz activa). |
| **Nivel dBFS** | Decibelios relativos a fondo de escala ($20 \log_{10}(\text{RMS})$). | `-60 dBFS` (silencio) a `-12 dBFS` (habla normal). |
| **Pico Máximo** | Amplitud instantánea más alta registrada en la ventana actual. | `0.0000` a `1.0000`. |
| **VAD (Voz)** | Detector acústico de presencia de voz humana con histeresis. | `🟢 VOZ DETECTADA` / `⚪ SILENCIO`. |
| **Enlace Gateway** | Estado de la conexión WebSocket con Amazon Nova 2.5 Sonic. | `LISTENING`, `SPEAKING`, `PROCESSING`, `VOICE_OFFLINE`. |
| **Barra de Nivel** | Barra gráfica horizontal con respuesta balística rápida y decaimiento suave. | Verde/Cyan en reposo; Cobre/Naranja al hablar. |

---

## 3. Matriz de Diagnóstico y Resolución de Problemas

### Escenario 1: El orbe no responde y el RMS permanece en 0.0000
1. **Comprobar Permisos del Navegador:**
   - En Chrome/Edge: Clic en el icono de candado o sintonizador a la izquierda de la barra de direcciones. Verificar que *"Micrófono"* esté en *"Permitir"*.
   - En Safari: Menú *Ajustes de Safari* → *Sitios web* → *Micrófono* → Configurar en *"Permitir"*.
   - En macOS: *Ajustes del Sistema* → *Privacidad y Seguridad* → *Micrófono* → Comprobar que el navegador tiene la casilla activada.
2. **Desbloqueo de AudioContext (Autoplay Policy):**
   - Los navegadores bloquean el audio hasta que el usuario interactúa. Hacer un clic en el botón `[🎤 HABLAR]` o en cualquier parte de la consola para desbloquear el contexto.

### Escenario 2: El indicador muestra "AudioWorklet: ScriptProcessor Fallback"
- Esto ocurre en navegadores que deshabilitan `AudioWorklet` en orígenes no seguros (`http://` sin HTTPS) o sandboxes restrictivos.
- **Acción:** No requiere intervención del operador; el `ScriptProcessor` garantiza la captura y downsampling a 16kHz sin interrupciones.

### Escenario 3: El enlace Gateway muestra "VOICE_OFFLINE" o error de credenciales
- Indica que el servidor WebSocket en el puerto 8088 no está corriendo o que la sesión temporal de AWS STS ha expirado.
- **Acción:**
  1. En una terminal local, verificar que el gateway esté activo:
     ```bash
     npm run voice:gateway
     ```
  2. Si el log del gateway indica `Your session has expired`, renovar credenciales AWS:
     ```bash
     aws login
     # o bien: aws sso login
     ```
  3. El frontend se reconecta automáticamente en cuanto el enlace está operativo.
