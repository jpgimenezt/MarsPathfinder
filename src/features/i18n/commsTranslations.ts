/**
 * ARES MISSION COMMS - Bilingual Internationalization (i18n) Engine
 * Soporte bilingüe completo: English (Predeterminado jurado internacional) & Español (Alternativo completo)
 */

export type SupportedLanguage = 'en' | 'es'
export type LanguageSelection = 'en' | 'es' | 'auto'

export interface CommsDictionary {
  headerTitle: string
  headerSubtitle: string
  demoBadgeEn: string
  demoBadgeEs: string
  states: {
    VOICE_OFFLINE: string
    CONNECTING: string
    LISTENING: string
    PROCESSING: string
    SPEAKING: string
    TOOL_EXECUTION: string
    RECONNECTING: string
    ERROR: string
  }
  telemetry: {
    liveBanner: string
    micTransmitting: string
    handsFreeActive: string
    aresSpeaking: string
    processing: string
    micStandby: string
    channelOffline: string
    wakeWordActive: string
  }
  controls: {
    connect: string
    disconnect: string
    talk: string
    transmitting: string
    stop: string
    micActive: string
    micMuted: string
    handsFree: string
    wakeWord: string
    send: string
    voiceLabel: string
    langLabel: string
    autoLang: string
  }
  inputPlaceholder: string
  welcomeMessage: string
  suggestedCommands: Array<{ label: string; text: string }>
  confirmPromptTitle: string
  confirmButton: string
  abortButton: string
  actionExecuted: string
  actionNotice: string
  footerSystem: string
}

export const COMMS_TRANSLATIONS: Record<SupportedLanguage, CommsDictionary> = {
  en: {
    headerTitle: 'ARES COPILOT',
    headerSubtitle: 'NASA SPACE APPS 2026 // REAL-TIME SPEECH & TACTICAL COPILOT',
    demoBadgeEn: '🌐 INTERNATIONAL DEMO MODE',
    demoBadgeEs: 'SWITCH TO SPANISH',
    states: {
      VOICE_OFFLINE: 'VOICE OFFLINE',
      CONNECTING: 'CONNECTING...',
      LISTENING: 'LISTENING',
      PROCESSING: 'PROCESSING...',
      SPEAKING: 'ARES SPEAKING',
      TOOL_EXECUTION: 'TACTICAL ACTION',
      RECONNECTING: 'RECONNECTING...',
      ERROR: 'COMM ERROR',
    },
    telemetry: {
      liveBanner: 'LIVE AUDIO TELEMETRY // FFT 16kHz IN / 24kHz OUT',
      micTransmitting: '🔴 MIC TRANSMITTING (SPEAK NOW)',
      handsFreeActive: '● HANDS-FREE ACTIVE (AWAITING SPEECH)',
      aresSpeaking: '● ARES TRANSMITTING AUDIO',
      processing: '● PROCESSING TACTICAL TURN...',
      micStandby: '○ MIC ON STANDBY (CLICK TO TALK)',
      channelOffline: '○ CHANNEL STANDBY',
      wakeWordActive: '● WAKE WORD ACTIVE ("Hey ARES" / "Hola ARES")',
    },
    controls: {
      connect: 'CONNECT LINK',
      disconnect: 'DISCONNECT',
      talk: '🎤 TALK (MIC)',
      transmitting: '🔴 TRANSMITTING... (CLICK TO SEND)',
      stop: 'STOP',
      micActive: 'MIC ACTIVE',
      micMuted: 'MUTED',
      handsFree: 'HANDS-FREE',
      wakeWord: 'WAKE WORD',
      send: 'TRANSMIT',
      voiceLabel: 'VOICE:',
      langLabel: 'LANG:',
      autoLang: 'AUTO-DETECT',
    },
    inputPlaceholder: "Voice or text command: 'Focus on Mount Sharp', 'Show geological layers', 'Plan EVA route'...",
    welcomeMessage:
      'ARES MISSION COMMS // REAL-TIME BIDIRECTIONAL SPEECH COPILOT\n' +
      '[ENGINE]: Amazon Nova 2.5 Sonic (Speech-to-Speech) // AWS Bedrock Runtime\n' +
      '[SYSTEM]: Tactical navigation copilot for human surface missions on Mars (NASA Space Apps 2026).\n' +
      'Press "TALK" to speak or type a command. I can control camera perspectives, inspect NASA scientific observations, and evaluate traversability.',
    suggestedCommands: [
      { label: 'Focus Mount Sharp', text: 'Focus on Mount Sharp' },
      { label: 'Geological Layers', text: 'Show geological layers' },
      { label: 'Thermal THEMIS', text: 'Activate THEMIS thermal layer' },
      { label: 'Elevation MOLA', text: 'Activate MOLA elevation layer' },
      { label: 'Plan EVA Route', text: 'Plan an EVA route' },
      { label: 'Compare Routes', text: 'Compare both routes' },
      { label: 'Mission Sim', text: 'Start mission simulation' },
    ],
    confirmPromptTitle: '⚠️ [TACTICAL CONFIRMATION // SECURITY LEVEL]',
    confirmButton: '[CONFIRM OPERATION]',
    abortButton: '[ABORT]',
    actionExecuted: '[TACTICAL ACTION]: Command executed successfully.',
    actionNotice: '[TACTICAL NOTICE]: Operation could not be completed.',
    footerSystem: 'ARES MISSION COMMS // AMAZON BEDROCK NOVA 2.5 SONIC // INTERNATIONAL SPEC',
  },
  es: {
    headerTitle: 'ARES COPILOT',
    headerSubtitle: 'NASA SPACE APPS 2026 // REAL-TIME SPEECH & TACTICAL COPILOT',
    demoBadgeEn: 'CAMBIAR A INGLÉS',
    demoBadgeEs: '🇦🇷 MODO ESPAÑOL ACTIVO',
    states: {
      VOICE_OFFLINE: 'ENLACE DESCONECTADO',
      CONNECTING: 'CONECTANDO...',
      LISTENING: 'A LA ESCUCHA',
      PROCESSING: 'PROCESANDO...',
      SPEAKING: 'TRANSMITIENDO VOZ',
      TOOL_EXECUTION: 'EJECUTANDO ACCIÓN',
      RECONNECTING: 'RECONECTANDO...',
      ERROR: 'ERROR DE ENLACE',
    },
    telemetry: {
      liveBanner: 'TELEMETRÍA DE AUDIO EN VIVO // FFT 16kHz IN / 24kHz OUT',
      micTransmitting: '🔴 MICRÓFONO TRANSMITIENDO (HABLA AHORA)',
      handsFreeActive: '● MODO MANOS LIBRES (A LA ESCUCHA)',
      aresSpeaking: '● ARES TRANSMITIENDO VOZ',
      processing: '● PROCESANDO TURNO TÁCTICO...',
      micStandby: '○ MICRÓFONO EN ESPERA (PULSA PARA HABLAR)',
      channelOffline: '○ CANAL EN ESPERA',
      wakeWordActive: '● PALABRA CLAVE ACTIVA ("Hola ARES" / "Hey ARES")',
    },
    controls: {
      connect: 'INICIAR ENLACE',
      disconnect: 'DESCONECTAR',
      talk: '🎤 HABLAR (MIC)',
      transmitting: '🔴 TRANSMITIENDO... (PULSA PARA ENVIAR)',
      stop: 'DETENER',
      micActive: 'MIC ACTIVO',
      micMuted: 'MUTED',
      handsFree: 'MANOS LIBRES',
      wakeWord: 'PALABRA CLAVE',
      send: 'TRANSMITIR',
      voiceLabel: 'VOZ:',
      langLabel: 'IDIOMA:',
      autoLang: 'AUTO-DETECTAR',
    },
    inputPlaceholder: "Instrucción de voz o texto: 'Enfocá Mount Sharp', 'Capas geológicas', 'Calculá ruta'...",
    welcomeMessage:
      'ARES MISSION COMMS // CANAL DE VOZ BIDIRECCIONAL EN TIEMPO REAL\n' +
      '[MOTOR]: Amazon Nova 2.5 Sonic (Speech-to-Speech) // AWS Bedrock Runtime\n' +
      '[SISTEMA]: Enlace táctico de navegación para misiones humanas en Marte (NASA Space Apps 2026).\n' +
      'Presiona "HABLAR" para iniciar transmisión o escribe una orden. Puedo orientar la cámara, consultar observaciones de NASA y evaluar la ruta.',
    suggestedCommands: [
      { label: 'Enfocá Mount Sharp', text: 'Enfocá Mount Sharp' },
      { label: 'Capas Geológicas', text: 'Mostrá las capas geológicas' },
      { label: 'Térmica THEMIS', text: 'Activá la capa térmica THEMIS' },
      { label: 'Relieve MOLA', text: 'Activá la capa de relieve MOLA' },
      { label: 'Ruta EVA', text: 'Planificá una ruta EVA' },
      { label: 'Comparar Rutas', text: 'Compará las dos rutas' },
      { label: 'Simulación Misión', text: 'Iniciá la simulación de misión' },
    ],
    confirmPromptTitle: '⚠️ [CONFIRMACIÓN TÁCTICA // NIVEL DE SEGURIDAD]',
    confirmButton: '[CONFIRMAR OPERACIÓN]',
    abortButton: '[ABORTAR]',
    actionExecuted: '[ACCIÓN TÁCTICA]: Comando ejecutado con éxito.',
    actionNotice: '[AVISO TÁCTICO]: No se pudo completar la operación.',
    footerSystem: 'SISTEMA ARES MISSION COMMS // AMAZON BEDROCK NOVA 2.5 SONIC',
  },
}
