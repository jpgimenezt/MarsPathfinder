# AresRoute — Agente Chatbot AWS Serverless Agentic
**NASA Space Apps Challenge 2026: Interplanetary Survival Guide — Martian Map**

Este módulo implementa un **Agente Chatbot Serverless Autónomo en AWS** desplegado y operativo en la región **`us-east-2`**, utilizando **Amazon Bedrock (Nova Pro)** + **AWS Lambda (Python 3.12)** con **Function URL pública** y almacenamiento en **Amazon S3**.

---

## 1. Endpoint en Vivo (Producción)

- **URL Pública (HTTP POST / CORS habilitado):**
  ```text
  https://laf33lrf26heqguui3pe3zqjje0rrnaw.lambda-url.us-east-2.on.aws/
  ```
- **Métodos permitidos:** `POST`, `OPTIONS`
- **Modelo de Inferencia:** `us.amazon.nova-pro-v1:0` (Amazon Bedrock)
- **Bucket de Documentos S3:** `s3://aresroute-mars-kb-306538367011-us-east-2/`

---

## 2. Arquitectura Serverless Agentic en AWS

```text
               +-------------------------------------------+
               |  Cliente Web / Frontend / Terminal cURL   |
               +---------------------+---------------------+
                                     | (HTTP POST JSON)
                                     v
               +-------------------------------------------+
               | AWS Lambda Function URL (aresroute-agent) |
               |               (Python 3.12)               |
               +---------------------+---------------------+
                                     |
                +--------------------+--------------------+
                | (Bucle ReAct / Bedrock Converse API)     |
                v                                          v
+-------------------------------+          +-------------------------------+
| Amazon Bedrock (Nova Pro)     |          | Herramientas Geodésicas Marte |
| * System Prompt NASA 2026     |<-------->| * calculate_mars_distance     |
| * Orquestación de Herramientas|          | * lookup_mission_dataset      |
| * Síntesis Científica         |          | * get_science_targets         |
+-------------------------------+          | * evaluate_eva_feasibility    |
                                           +-------------------------------+
```

### Principios Científicos Integrados en el Agente:
1. **Radio Marciano Estricto:** Usa $R_M = 3,389.5\text{ km}$ ($3,389,500\text{ m}$), nunca el terrestre ($6,371\text{ km}$).
2. **Evaluación de Walkback Limit:** Límite nominal a pie de $5\text{ km}$, alerta ante pendientes $>15^\circ$ o $>20^\circ$ (NO-GO).
3. **Honestidad Epistémica:** Identifica obstáculos submétricos no evaluables cuando no se cuenta con un DEM métrico (HiRISE DTM).
4. **Objetivos de la Hackatón 2026:** Conoce tanto el Delta del Cráter Jezero (Perseverance) como las formaciones **boxwork** del Monte Sharp en el Cráter Gale (Curiosity 2024–2025).

---

## 3. Ejemplos de Invocación

### Ejemplo 1: Cálculo de distancia y viabilidad de caminata en Jezero
```bash
curl -s -X POST https://laf33lrf26heqguui3pe3zqjje0rrnaw.lambda-url.us-east-2.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Cuál es la distancia entre el abanico deltaico de Jezero (lat 18.42, lon 77.45) y Neretva Vallis (lat 18.51, lon 77.30) en Marte, y qué opinas de hacer esa caminata a pie según los límites de la NASA?"}'
```

**Respuesta recibida:**
```json
{
  "reply": "La distancia entre el abanico deltaico de Jezero y Neretva Vallis es de aproximadamente 9.96 km. Según los límites de la NASA, una caminata a pie máxima nominal es de 5 km. Por lo tanto, hacer esa caminata a pie no es factible debido a que excede el límite de caminata a pie nominal. Además, los peligros submétricos no han sido evaluados debido a la falta de un DEM métrico...",
  "model_used": "us.amazon.nova-pro-v1:0",
  "tools_called": [
    {
      "tool": "calculate_mars_distance",
      "input": {"lat1": 18.42, "lat2": 18.51, "lon1": 77.45, "lon2": 77.3},
      "output": {"distance_km": 9.959, "mars_radius_used_km": 3389.5, "status": "CALCULATED_SPHERICAL_MARS_GEODESY"}
    },
    {
      "tool": "evaluate_eva_feasibility",
      "input": {"eva_mode": "FOOT", "total_distance_km": 9.959},
      "output": {"feasibility": "UNFEASIBLE_WALKBACK_EXCEEDED", "walkback_assessment": "Radio a pie: 9.959 km (Límite nominal: 5.0 km, límite de emergencia: 8.0 km)."}
    }
  ]
}
```

### Ejemplo 2: Consulta sobre formaciones Boxwork en Mount Sharp
```bash
curl -s -X POST https://laf33lrf26heqguui3pe3zqjje0rrnaw.lambda-url.us-east-2.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué son las formaciones boxwork sugeridas por NASA en el desafío y qué misión o instrumento las estudió en Marte?"}'
```

---

## 4. Estructura de Archivos

```text
aws-agent/
├── README.md                      # Esta documentación y guía de uso
├── system_prompt.txt              # System Prompt oficial del agente
├── template.yaml                  # Plantilla AWS SAM de despliegue serverless
├── action_groups/
│   ├── openapi.json               # Esquema OpenAPI 3.0 de herramientas
│   └── lambda_function.py         # Código Python 3.12 (Bucle ReAct Bedrock + Herramientas)
└── knowledge_base/                # Documentos de referencia para ingesta
    ├── 01_challenge_framework.md
    ├── 02_nasa_missions_and_datasets.md
    ├── 03_mars_geodesy_and_cartography.md
    ├── 04_science_objectives_and_targets.md
    └── 05_eva_planning_and_astronaut_safety.md
```

---

## 5. Integración con el Frontend Web
Puedes conectar este endpoint a la aplicación web React mediante una simple llamada `fetch`:
```typescript
async function askMarsAgent(question: string) {
  const response = await fetch("https://laf33lrf26heqguui3pe3zqjje0rrnaw.lambda-url.us-east-2.on.aws/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question })
  });
  const data = await response.json();
  return data;
}
```
