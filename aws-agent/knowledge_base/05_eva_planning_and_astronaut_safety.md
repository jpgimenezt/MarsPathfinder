# Planificación de EVA y Seguridad del Astronauta en Superficie Marciana

## 1. Fisiología y Restricciones del Traje Espacial de Superficie (mEMU / Mars Suit)
- **Masa del traje:** ~100 a 140 kg en la Tierra (equivalente a ~38 a 53 kg bajo gravedad marciana de 0.38 g).
- **Consumibles nominales del sistema de soporte vital (PLSS):**
  - Autonomía nominal: 6 a 8 horas de actividad extravehicular continua.
  - Reserva de emergencia mandatoria: mínimo 20–25% (45 a 90 minutos de margen de contingencia).
  - Tasa de consumo metabólico: 200 a 450 W (se duplica o triplica al subir pendientes empinadas o caminar sobre suelo no consolidado).
- **Movilidad articular reducida:** La presurización interna del traje (a ~29.6 a 34.5 kPa) restringe la flexión de rodillas, codos y dedos.
  - Un astronauta presurizado NO puede escalar cornisas verticales ni superar rocas mayores a 0.5 metros sin asistencia o herramientas específicas.

---

## 2. Clasificación de Pendientes y Límites de Terreno

| Pendiente | Clasificación de Tránsito Humano | Implicación Operativa |
|---|---|---|
| **0° – 8°** | Terreno Plano / Tránsito Nominal | Marcha a pie estable (~2 a 3 km/h). Gasto metabólico basal del traje. |
| **8° – 15°** | Pendiente Moderada | Requiere reducción de velocidad (~1 to 1.5 km/h). Incremento del 50% en consumo de O2 y agua de refrigeración. |
| **15° – 20°** | Terreno Difícil / Precaución | Resbalamiento en regolito fino/arena eólica. Riesgo de caída con traje presurizado. Tránsito asistido por rover o bastones geológicos. |
| **> 20°** | Zona Peligrosa / No Nominal (NO-GO) | Infranqueable para marcha a pie estándar sin anclajes o cuerdas. Peligro de deslizamiento incontrolado y daño por abrasión en el tejido del traje. |

> **IMPORTANTE SOBRE DATOS ORBITALES:** Un modelo orbital con resolución de 463 m/píxel (MOLA) suaviza pendientes reales locales. Una celda con pendiente aparente de 5° en MOLA puede ocultar acantilados de 30° o campos de rocas de 1 metro no resueltos. Por ello, si solo se dispone de MOLA, el análisis debe etiquetarse como `RIESGO NO EVALUABLE A ESCALA SUBMETRICA`.

---

## 3. Modos de Movilidad y Regla de Walkback (Retorno a Pie)
1. **EVA a Pie sin Vehículo (Uncrewed Walk):**
   - Radio máximo seguro: **5 km** desde el hábitat base.
   - Velocidad media conservadora: 2 km/h considerando paradas geológicas.
2. **EVA Asistida por Rover Tripulado (Pressurized or Unpressurized Rover):**
   - Permite excursiones de hasta 15 a 20 km.
   - **Regla de Walkback Limit:** En todo momento de la expedición con rover no presurizado, la distancia máxima a la base o refugio presurizado no debe exceder la distancia que el astronauta con menor nivel de consumibles pueda caminar de regreso a pie en caso de falla catastrófica del vehículo (típicamente 8 a 10 km).

---

## 4. Riesgos Ambientales y Meteorología
- **Radiación Cósmica Galáctica (GCR) y Eventos de Partículas Solares (SPE):**
  - Dosis típica en superficie: ~200 a 300 mSv/año (debido a la delgada atmósfera marciana de CO2 de ~6 mbar y falta de campo magnético).
  - Alerta SPE: En caso de eyección de masa coronal solar dirigida hacia Marte, la tripulación debe abortar la EVA y regresar al refugio con blindaje de regolito/agua en menos de 30–60 minutos.
- **Tormentas de Polvo Globales y Diablos de Polvo (Dust Devils):**
  - Reducción severa de la visibilidad y generación de campos electrostáticos en el traje.
  - La temperatura diurna en el ecuador puede oscilar entre +20°C a mediodía y -73°C al atardecer; las EVAs deben sincronizarse con el ciclo térmico diurno favorable.

---

## 5. Latencia de Comunicaciones (Autonomía de la Tripulación)
- La distancia Tierra-Marte varía entre 55 millones y 400 millones de kilómetros.
- El retraso de señal de radio de ida y vuelta (round-trip) es de **6 a 44 minutos** (3 a 22 min por trayecto).
- **Conclusión de diseño:** El astronauta NO puede esperar confirmaciones en tiempo real del control de misión en la Tierra para desvíos de ruta inmediatos o evaluación de peligros tácticos. El mapa local y el asistente inteligente deben operar con total autonomía a bordo.
