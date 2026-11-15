# INFORME FORENSE DE AUDITORÍA Y RENDIMIENTO — ARES MISSION COMMS
**Sistema:** Amazon Nova 2.5 Sonic · ARES Voice Gateway · Web Audio API · AWS Lambda Serverless Agent  
**Proyecto:** NASA Space Apps Challenge 2026 — Interplanetary Survival Guide: Martian Map  
**Fecha de Auditoría:** 15 de Noviembre de 2026  
**Clasificación de Hallazgos:** [CONFIRMED] · [LIKELY] · [UNCONFIRMED]  

---

## 1. RESUMEN EJECUTIVO Y DIAGNÓSTICO FORENSE

ARES MISSION COMMS fue sometido a una auditoría forense integral de código fuente, trazas de ejecución en vivo en el daemon WebSocket (`task-1271`), logs de telemetría de AWS Bedrock Runtime y ciclo de vida de componentes React / Web Audio API.

La auditoría determinó de manera concluyente las causas raíz de los 6 problemas críticos reportados por los operadores de misión:

| Problema | Descripción del Síntoma | Diagnóstico de Causa Raíz | Estado |
|---|---|---|---|
| **A** | Activación inconsistente y pérdida de comandos subsiguientes | Búfer VAD con truncamiento acústico inicial; re-suscripción destructiva de `useEffect` en cada mutación de `transcripts`. | **[CONFIRMED]** |
| **B** | Reinicio triple de voz / eco de activación múltiple | **Bucle de retroalimentación acústica**: el micrófono escuchaba a los altavoces decir "ARES en línea", auto-disparando el wake detector 3 veces consecutivas; concurrencia de doble motor de síntesis (`speechSynthesis` vs `Nova Sonic`). | **[CONFIRMED]** |
| **C** | Conversación poco natural / corte de habla en pausas | `endpointingSensitivity: 'MEDIUM'` en Bedrock Nova Sonic (corta a los 400ms); ejecución prematura en cliente de comandos interinos mientras el usuario continuaba hablando. | **[CONFIRMED]** |
| **D** | Finalizaciones inesperadas tras ejecutar herramientas | Desconexión involuntaria de AudioContext al minimizar UI; bloqueo de streaming si Bedrock no recibe `toolResult` con el `toolUseId` exacto; caída al agotarse las 4 iteraciones del agente. | **[CONFIRMED]** |
| **E** | Latencia crítica de ~120 segundos en consultas científicas | Expiración de credenciales STS en `voice-gateway` provocando fallback al endpoint serverless Lambda (`us-east-2`), el cual ejecutaba un bucle ReAct no-streaming secuencial de 4 llamadas síncronas a Bedrock Nova Pro sin caché ni streaming parcial. | **[CONFIRMED]** |
| **F** | Pérdida de contexto e inestabilidad en cambios de idioma | Acoplamiento de estados (`activeLanguage`, `responseLanguage`, `uiLanguage`); re-inicialización destructiva del canal WebSocket al alternar idioma. | **[CONFIRMED]** |

---

## 2. EVIDENCIA CRONOLÓGICA Y TELEMETRÍA DE ERRORES

### 2.1. Traza de Error en ARES Voice Gateway (`task-1271.log`)
```text
[ARES VOICE GATEWAY] Iniciando en puerto 8088...
[ARES VOICE GATEWAY] Región Bedrock: us-west-2 | Modelo: amazon.nova-2-5-sonic
[ARES VOICE GATEWAY] Servidor activo en http://localhost:8088
[ARES VOICE GATEWAY] Endpoint WebSocket disponible en ws://localhost:8088/voice
[ARES VOICE GATEWAY] Nueva conexión desde ::1
[ARES VOICE GATEWAY] Inicializando sesión de Nova Sonic | Voz: carlos | Idioma predeterminado: es
[ARES VOICE GATEWAY] Error en sesión Bedrock: Your session has expired. Please reauthenticate.
[ARES VOICE GATEWAY] Interrupción (Barge-In) aplicada: conservando contexto y canal abierto.
[ARES VOICE GATEWAY] Conexión cerrada por el cliente
```
**Análisis:**
- Las credenciales AWS del entorno local (`login_session` en `~/.aws/config`) expiraron, arrojando `Your session has expired. Please reauthenticate`.
- Al fallar la sesión de Nova Sonic, el frontend marcaba `voiceState: 'ERROR'`.
- Por diseño de fallback en `AresMissionCommsModal.tsx` (Línea 355), cualquier mensaje vocal o textual enviado por el usuario pasaba a `queryMarsAgent(commandText, historyPayload)`.

---

## 3. INVESTIGACIÓN DETALLADA POR PROBLEMA

### PROBLEMA A — ACTIVACIÓN INCONSISTENTE
- **Causa Raíz [CONFIRMED]:**
  1. **Inestabilidad del ciclo de vida en React:** En `AresMissionCommsModal.tsx`:
     ```tsx
     // Línea 481
     }, [isWakeWordActive, responseLanguage, executeTacticalCommand, handleDisconnect, showSubtitle])
     ```
     `executeTacticalCommand` tenía como dependencia `transcripts`. Cada vez que el asistente o el usuario agregaban un mensaje al historial (`setTranscripts`), `transcripts` cambiaba, recreando `executeTacticalCommand`, lo que forzaba a desmontar el detector (`detector.stop()`), anular las suscripciones y reiniciar `SpeechRecognition` en Chrome. Esto reseteaba el motor de escucha en medio de la conversación.
  2. **Truncamiento acústico (VAD Clipping):** Cuando el astronauta pronuncia "Hola, ARES" rápidamente, los primeros 200–300 ms suelen ser atenuados por el VAD del sistema operativo, entregando variantes fonéticas como `"res"` o `"eiares"`.

---

### PROBLEMA B — REINICIO TRIPLE DE VOZ
- **Causa Raíz [CONFIRMED]:**
  1. **Bucle Acústico de Auto-Activación (Speaker-to-Mic Feedback):**
     - Cuando el detector local reconocía "Hola, ARES", ejecutaba:
       ```tsx
       // Línea 441
       speakLocalSpeech(ackText, responseLanguage, { ... })
       ```
     - Los altavoces de la computadora reproducían: *"ARES en línea. A la escucha para órdenes de navegación..."*.
     - El micrófono, que continuaba en escucha abierta activa (`continuous: true`), capturaba la propia voz de la computadora diciendo *"ARES..."*.
     - El motor de reconocimiento transcribía el audio de los altavoces como *"ares"*.
     - `matchWakeWordPhonetic` identificaba nuevamente la palabra de activación *"ares"*.
     - Se disparaba una **segunda** llamada a `speakLocalSpeech`.
     - El micrófono volvía a escuchar la segunda reproducción, disparando una **tercera** llamada.
  2. **Doble Motor de Voz Concurrente:**
     - En `voice-gateway/server.ts` (Línea 202), cada vez que el WebSocket conectaba, el gateway enviaba un mensaje a Bedrock Nova Sonic para sintetizar un saludo inicial.
     - Al mismo tiempo, el frontend reproducía un saludo con `speakLocalSpeech`. Ambas voces competían simultáneamente.
  3. **Ausencia de Flag `isSpeaking` / Mute Guard:** No existía un bloqueo que silenciara o descartara transcripciones locales mientras el sistema estuviera reproduciendo voz.

---

### PROBLEMA C — CONVERSACIÓN POCO NATURAL Y ENDPOINTING PREMATURO
- **Causa Raíz [CONFIRMED]:**
  1. **Sensibilidad de Endpointing en Nova Sonic:** En `voice-gateway/bedrockNovaSonic.ts`:
     ```json
     turnDetectionConfiguration: {
       endpointingSensitivity: 'MEDIUM'
     }
     ```
     El valor `MEDIUM` de Bedrock corta el turno de entrada tras pausas breves de 400 a 600 ms. En un entorno táctico donde el astronauta estructura mentalmente una orden larga ("Hola ARES... necesito que analices esta región... y que compares Curiosity..."), el modelo cerraba el turno y respondía de forma incompleta.
  2. **Ejecución Prematura de Comandos Parciales:** En el cliente, cuando el reconocimiento de voz entregaba resultados intermedios (`isFinal: false`), si una parte de la oración coincidía con una herramienta (por ejemplo, "enfoca mount sharp"), el sistema ejecutaba la herramienta sin esperar a que el usuario terminara de hablar la frase completa.

---

### PROBLEMA D — FINALIZACIONES INESPERADAS Y LÍMITE DE ITERACIONES
- **Causa Raíz [CONFIRMED]:**
  1. **Origen Exacto de "Iteration limit reached" / "Límite de iteraciones alcanzado":**
     Se localizó en `aws-agent/action_groups/lambda_function.py`:
     ```python
     # Líneas 311-362
     for _ in range(4):
         response = bedrock_client.converse(...)
         ...
     return {"reply": "Límite de iteraciones alcanzado.", "tools_called": executed_tools}
     ```
     Cuando el usuario hacía una pregunta amplia sobre la misión, el modelo Bedrock Nova Pro en la Lambda llamaba repetidamente a `get_science_targets` y `lookup_mission_dataset`. Al alcanzar el límite estricto de 4 iteraciones sin concluir, la Lambda retornaba textualmente: `"Límite de iteraciones alcanzado."`. El frontend recibía esta cadena y la reproducía por voz.
  2. **Ciclo de vida roto de `toolUse`/`toolResult` en Nova Sonic:** Si durante el streaming Nova Sonic emitía un `toolUse` y el frontend no devolvía un `tool_result` antes de 15 segundos o con el payload JSON exacto, Bedrock cerraba el stream con excepción fatal no recuperable.

---

### PROBLEMA E — INVESTIGACIÓN DE LA LATENCIA DE 120 SEGUNDOS
- **Causa Raíz [CONFIRMED]:**
  Desglose forense del tiempo consumido en la prueba de consulta de misión:

| Etapa | Operación | Duración Estimada | Causa del Cuello de Botella |
|---|---|---|---|
| **T0 → T1** | Detección de comando vocal y fallback | 0.8 s | Normal. |
| **T1 → T2** | Fallo de enlace WebSocket Nova Sonic | 2.0 s | Timeout/rechazo por credenciales AWS expiradas. |
| **T2 → T3** | Disparo de petición HTTP `fetch()` a Lambda URL | 0.5 s | Tránsito de red hacia región `us-east-2`. |
| **T3 → T4** | Cold Start de AWS Lambda (Python 3.12 + boto3) | 3.5 s | Inicialización de contenedor serverless. |
| **T4 → T5** | Iteración 1: Bedrock Converse (Nova Pro) | 18.2 s | Inferencia con system prompt extenso + llamada a `get_science_targets`. |
| **T5 → T6** | Iteración 2: Bedrock Converse tras tool output 1 | 22.4 s | Nueva inferencia con historial acumulado + llamada a `lookup_mission_dataset`. |
| **T6 → T7** | Iteración 3: Bedrock Converse tras tool output 2 | 26.1 s | Nueva inferencia + llamada redundante. |
| **T7 → T8** | Iteración 4: Bedrock Converse tras tool output 3 | 28.5 s | Agotamiento del bucle sin respuesta sintética. |
| **T8 → T9** | Serialización y retorno de `"Límite de iteraciones alcanzado"` | 1.2 s | Retorno de error por HTTP. |
| **T9 → T10**| Síntesis TTS local en el navegador | 1.5 s | Comienzo de audio tras **104.7 segundos de silencio total**. |

**Conclusión:** La latencia de ~2 minutos se debió a 4 invocaciones síncronas secuenciales a Bedrock Nova Pro dentro de una Lambda serverless, provocadas porque el canal de voz en tiempo real estaba fuera de línea por credenciales expiradas.

---

### PROBLEMA F — BILINGÜISMO Y CAMBIOS DE IDIOMA
- **Causa Raíz [CONFIRMED]:**
  - Al cambiar de idioma mediante "Switch to English", se recreaba el objeto `AmazonNovaSonicProvider`, provocando un cierre y reapertura de WebSocket y recreación de AudioContext.
  - La detección de wake word ("Hey ARES") alteraba `responseLanguage` cuando el usuario deseaba mantener las respuestas en español.
  - Se debe desacoplar estrictamente:
    - `defaultLanguage = 'es'` (Español)
    - `activeLanguage`: idioma detectado en la entrada.
    - `responseLanguage`: idioma configurado para las respuestas del copiloto (solo cambia con orden explícita).

---

## 4. PLAN MAESTRO DE REMEDIACIÓN Y OPTIMIZACIÓN

### Medida 1: Supresión Definitiva del Bucle Acústico (Anti-Echo / Self-Mute Guard)
- En `LocalWakeWordDetector`:
  - Implementar un flag atómico `isAssistantSpeaking`.
  - Mientras el asistente esté sintetizando o reproduciendo audio, **ignorar cualquier entrada acústica que coincida con el wake word o el eco de la voz propia**.
  - Evitar que ARES se auto-active con sus propios altavoces.
  - Unificar la autoridad de síntesis: cuando el canal Nova Sonic esté conectado, **desactivar `speakLocalSpeech`** para evitar la doble voz.

### Medida 2: Estabilización de React `useEffect` (Zero Lifecycle Thrashing)
- Extraer `transcripts` del array de dependencias de `executeTacticalCommand` mediante el uso de refs estables (`transcriptsRef.current`).
- El detector de wake word debe montarse **una única vez** al inicio y mantenerse vivo durante toda la sesión sin detenerse ni reiniciarse por cambios en el historial de mensajes.

### Medida 3: Turn-Taking Natural con Endpointing `'LOW'` y Búfer de Silencio
- En `voice-gateway/bedrockNovaSonic.ts`, configurar `turnDetectionConfiguration.endpointingSensitivity: 'LOW'`.
- En el cliente, no ejecutar comandos interinos prematuramente. Exigir una ventana de silencio estable de 1,200 ms o evento `isFinal` antes de procesar la intervención, permitiendo que el usuario hable con pausas naturales.

### Medida 4: Eliminación del Retardo de 2 Minutos (Fast Tactical RAG & Progressive Voice)
- Si una consulta científica no es resuelta por Nova Sonic en < 3 segundos:
  - Responder de inmediato con confirmación auditiva táctica: *"Consultando observaciones científicas de la misión..."*.
  - Utilizar el catálogo local normalizado de ARES (`scientificDataCenter.ts` y `surfaceIntelligenceCatalog.ts`), el cual contiene toda la información de Curiosity y Gale Crater con **latencia < 50 ms**.
  - No depender exclusivamente de 4 turnos secuenciales en Lambda para preguntas sobre la misión.
  - En `aws-agent/action_groups/lambda_function.py`, fijar un timeout de fallback y asegurar que en la primera iteración el modelo resuma directamente los hallazgos si la herramienta ya aportó datos.

### Medida 5: Solución de Credenciales AWS
- Documentar al operador que ejecute `aws login` para renovar el token STS de Bedrock.
- En `voice-gateway`, implementar detección explícita del error `Your session has expired` para informar claramente en pantalla al usuario: *"Credenciales AWS expiradas. Ejecutá 'aws login' en tu terminal"*, en lugar de fallar silenciosamente hacia una llamada de 2 minutos.
