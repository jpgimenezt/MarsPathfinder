# Guía y Marco Oficial: Interplanetary Survival Guide — Martian Map
**NASA Space Apps Challenge 2026**

## 1. Resumen de la Misión y Desafío
Durante décadas, la NASA ha explorado Marte de forma robótica, estudiando su entorno extremo, cartografiando su superficie y recopilando múltiples tipos de datos. Cuando los primeros astronautas pisen suelo marciano, necesitarán el mejor mapa posible con información detallada de sus rutas, destinos, condiciones ambientales y los datos necesarios para completar su misión de manera rápida y segura.

El desafío consiste en crear una **vista integrada y por capas de una ubicación o ruta en la superficie marciana**, combinando datos de múltiples misiones científicas de la NASA, que asista a un explorador humano a planificar y ejecutar una caminata espacial marciana (Marswalk / EVA) exitosa, realizando al mismo tiempo ciencia relevante.

## 2. Antecedentes y Necesidad Operativa
- **Pensamiento crítico humano:** Los astronautas en superficie aplican razonamiento en tiempo real, conectan observaciones geológicas inesperadas y resuelven contingencias que los rovers autónomos no pueden discernir.
- **Limitación de herramientas actuales:** Herramientas como JPL Mars Trek o USGS Planetary Geologic Mapping ofrecen capas globales y regionales, pero no están diseñadas para la escala hiperlocal que requiere un astronauta en una caminata de superficie (cientos de metros a pocos kilómetros).
- **Integración multidimensional:** Los datos orbitales y de superficie de la NASA existen en repositorios dispersos (PDS, Mars Trek, ODE). La misión exige fusionar al menos tres familias de datos científicamente complementarias.

## 3. Objetivos Operativos del Astronauta
1. **Definir Objetivos Científicos:** Establecer qué hipótesis geológica o astrobiológica se investigará (e.g., depósitos lacustres en Jezero, formaciones boxwork en Mount Sharp, canales fluviales, estratigrafía de cráteres).
2. **Seleccionar ROI (Región de Interés):** Delimitar un sector con alta densidad de datos contrastados (e.g., ruta del rover Perseverance en Jezero Crater o Curiosity en Gale Crater).
3. **Superposición Multiespectral y Geofísica:** Integrar al menos 3 fuentes:
   - Imágenes ópticas de contexto y alta resolución (CTX, HiRISE).
   - Topografía y altimetría (MOLA, DTMs locales).
   - Infrarrojo térmico (THEMIS) o espectrometría mineral (CRISM).
   - Imágenes de superficie in-situ (Mastcam-Z, Navcam).
4. **Seguridad y Planificación de Ruta (EVA):**
   - Evaluar pendientes, microrrelieve y rugosidad.
   - Definir distancia total y límites de autonomía (walkback limit).
   - Distinguir riesgos detectados de riesgos no evaluables por falta de resolución.
   - Identificar puntos de muestreo de alto valor geológico.

## 4. Filosofía Epistémica y Criterios de Evaluación
- **Ciencia antes que espectáculo:** Las decisiones deben basarse en resoluciones reales y fuentes verificadas.
- **Trazabilidad (Proveniencia):** Cada recomendación o dato debe identificar instrumento, resolución, tipo de dato y limitaciones.
- **Autonomía Operativa:** Debido a la latencia de comunicaciones Tierra-Marte (3 a 22 minutos por sentido), las herramientas del astronauta deben permitir toma de decisiones local sin esperar a Houston.
