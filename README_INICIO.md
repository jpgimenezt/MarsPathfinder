# AresRoute — inicio rápido con OpenCode

Este kit de planificación contiene `AGENTS.md`. El nombre **AresRoute** es provisional y puede modificarse; evita confundirlo con una marca o proyecto respaldado por NASA.

## 1. Iniciar el repositorio (Linux/Kubuntu)

```bash
mkdir -p ares-route
cd ares-route
git init
# Copiar aquí AGENTS.md del kit (a la raíz del repositorio).
opencode
```

**IMPORTANTE:** no ejecutar `/init` encima de un `AGENTS.md` ya redactado sin revisarlo, porque puede modificarlo o reemplazar decisiones. OpenCode admite el archivo directamente y lo carga como instrucciones del proyecto.

## 2. Primer mensaje para OpenCode

```text
Leé completamente AGENTS.md y seguí sus restricciones. Estamos trabajando
para el NASA Space Apps Challenge 2026, desafío Interplanetary Survival Guide:
Martian Map. Quiero comenzar con Fase 0 y la primera parte de Fase 1.

1. Inspeccioná el entorno y el repositorio; no borres ningún archivo.
2. Verificá fuentes científicas reales de Jezero: Mars Trek CTX, MOLA y THEMIS,
   servicios GetCapabilities, CORS, proyección y cobertura. No inventes resultados.
3. Documentá los hallazgos en docs/DATA_SOURCES.md y las decisiones técnicas
   en docs/DECISIONS.md. Dejá los fallos expresamente identificados.
4. Inicializá Vite + React + TypeScript + OpenLayers y construí una primera
   pantalla responsive con mapa 2D, una capa NASA real comprobada y panel de
   fuentes; si el servicio falla, prepará fallback estático con atribución.
5. Ejecutá los comandos disponibles y reportá exactamente qué funcionó.

No implementes 3D, autenticación, backend, chat de IA ni datos meteorológicos
falsos. Antes de añadir dependencias o rutas automáticas, justificá su utilidad.
Entregá un MVP incremental, de forma que se pueda desplegar pronto.
```

## 3. Criterio de prioridad

P0: UI 2D + capas científicas reales + paradas + trazado manual de ruta + distancia de Marte + trazabilidad de datos + deploy.
P1: DEM real + perfil aproximado de elevación + análisis exploratorio del recorrido.
P2: malla 3D local con DEM verificado. No intentar planeta global 3D primero.

## 4. Recursos comprobados documentalmente

- Enunciado: https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=details
- Copia de detalles, objetivos y cinco recursos: https://hackathlone.com/challenges/interplanetary-survival-guide-martian-map
- NASA Mars Trek: https://trek.nasa.gov/mars/
- Documentación WMTS NASA: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
- NASA Perseverance: https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/
- OpenCode AGENTS.md: https://opencode.ai/docs/instructions

Estos enlaces se identificaron en documentación pública. La conectividad de cada endpoint desde la futura aplicación aún debe validarse.
