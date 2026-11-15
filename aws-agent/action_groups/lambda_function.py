"""
AWS Lambda Serverless Agentic Chatbot & Tools
NASA Space Apps Challenge 2026: Interplanetary Survival Guide — Martian Map
"""

import json
import math
import os
import boto3

MARS_MEAN_RADIUS_KM = 3389.5
MARS_MEAN_RADIUS_METERS = 3389500.0
NOMINAL_WALK_SPEED_KMH = 2.5
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0")

# Cliente Bedrock Runtime
bedrock_client = boto3.client("bedrock-runtime")

SYSTEM_PROMPT = """Eres AresRoute-Agent, especialista en cartografía marciana, navegación de superficie e integración de datos científicos de la NASA para misiones de exploración humana (Marswalk / EVA), desarrollado para el desafío 'Interplanetary Survival Guide: Martian Map' de NASA Space Apps Challenge 2026.

REGLAS NO NEGOCIABLES:
1. CIENCIA ANTES QUE ESPECTÁCULO: Toda afirmación debe anclarse en datos reales de NASA (MRO CTX/HiRISE/CRISM, MGS MOLA, Odyssey THEMIS, Perseverance, Curiosity). Nunca inventes elevaciones ni asegures condiciones en tiempo real.
2. GEODESIA MARCIANA ESTRICTA: El radio medio de Marte es 3,389.5 km. NUNCA uses el radio de la Tierra (~6,371 km). Usa siempre la herramienta 'calculate_mars_distance'.
3. PROVENIENCIA Y LIMITACIONES: Cita siempre misión, instrumento, resolución espacial y limitaciones de las capas. La capa visual MOLA es un hillshade coloreado, no un DEM numérico.
4. NUNCA DECLARAR UNA RUTA COMO TOTALMENTE SEGURA: Sin un DTM de resolución métrica (HiRISE DTM), los obstáculos sub-métricos (>0.5 m) no están evaluados. Llama a las rutas 'rutas exploratorias'.
5. OBJETIVOS CIENTÍFICOS:
   - Cráter Jezero (18.38°N, 77.58°E): depósitos deltaicos lacustres, biofirmas, canal Neretva Vallis, borde Noeico.
   - Monte Sharp en Cráter Gale (4.59°S, 137.44°E): formaciones boxwork (estudiadas por Curiosity en 2024-2025), redes hidrotermales subterráneas habitables.
6. SEGURIDAD EVA: Marcha a pie máxima nominal de 5 km (walkback limit). Pendientes: <8° nominal; 8°-15° moderada; 15°-20° difícil; >20° NO-GO para marcha a pie estándar.
"""

DATASET_CATALOG = {
    "MRO_CTX": {
        "instrument": "CTX (Context Camera)",
        "mission": "Mars Reconnaissance Orbiter (NASA/JPL/MSSS)",
        "resolution": "5 - 6 metros / píxel",
        "data_family": "Optica (escala de grises regional)",
        "is_numeric_dem": False,
        "limitations": "Solo imágenes visuales monocromáticas. NO contiene elevaciones numéricas directas ni detecta rocas sub-métricas.",
        "official_source_url": "https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars"
    },
    "MRO_HIRISE": {
        "instrument": "HiRISE (High Resolution Imaging Science Experiment)",
        "mission": "Mars Reconnaissance Orbiter (NASA/JPL/Univ. Arizona)",
        "resolution": "0.25 - 0.50 metros / píxel (imágenes); 1 - 2 metros (DTM)",
        "data_family": "Optica de ultra-alta resolución y Topografía DTM estéreo",
        "is_numeric_dem": True,
        "limitations": "Excelente detalle para rocas individuales (>0.5 m), pero la cobertura es hiperlocal (solo franjas específicas, no global).",
        "official_source_url": "https://www.uahirise.org/"
    },
    "MGS_MOLA": {
        "instrument": "MOLA (Mars Orbiter Laser Altimeter)",
        "mission": "Mars Global Surveyor (NASA/GSFC)",
        "resolution": "463 metros / píxel a nivel global (128 pix/deg)",
        "data_family": "Topografía global / Altimetría láser respecto al Areoide",
        "is_numeric_dem": True,
        "limitations": "El producto visual ClrShade es un hillshade coloreado (RGB), NO un raster numérico directo. Resolución demasiado gruesa para evaluar seguridad de pasos de EVA.",
        "official_source_url": "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_color_shaded_relief_463m"
    },
    "ODYSSEY_THEMIS": {
        "instrument": "THEMIS (Thermal Emission Imaging System)",
        "mission": "2001 Mars Odyssey (NASA/JPL/ASU)",
        "resolution": "100 metros / píxel (Infrarrojo Day/Night IR), 18 m (Visible)",
        "data_family": "Infrarrojo térmico / Inercia térmica",
        "is_numeric_dem": False,
        "limitations": "Mosaicos térmicos históricos normalizados; NO representan temperatura meteorológica en tiempo real.",
        "official_source_url": "https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars"
    },
    "MRO_CRISM": {
        "instrument": "CRISM (Compact Reconnaissance Imaging Spectrometer for Mars)",
        "mission": "Mars Reconnaissance Orbiter (NASA/JPL/JHU-APL)",
        "resolution": "18 - 36 metros / píxel (modo dirigido hiperespectral)",
        "data_family": "Espectrometría mineralógica de reflectancia",
        "is_numeric_dem": False,
        "limitations": "Identifica presencia de filosilicatos (arcillas) y sulfatos hidratados. Requiere interpretación mineralógica especializada.",
        "official_source_url": "https://ode.rsl.wustl.edu/mars/"
    },
    "PERSEVERANCE_MASTCAMZ": {
        "instrument": "Mastcam-Z & Navcam",
        "mission": "Mars 2020 Perseverance Rover (NASA/JPL-Caltech)",
        "resolution": "Milimétrica a submétrica (a nivel de superficie)",
        "data_family": "Imágenes in-situ en color y estéreo (POV de superficie)",
        "is_numeric_dem": False,
        "limitations": "Vistas a ras de suelo tomadas a lo largo de la traza de Perseverance en Jezero. Excelente para validación visual de afloramientos.",
        "official_source_url": "https://mars.nasa.gov/mars2020/multimedia/raw-images/"
    }
}

SCIENCE_TARGETS = {
    "JEZERO": [
        {
            "name": "Abanico Deltaico Occidental (Western Delta Front)",
            "lat": 18.42,
            "lon": 77.45,
            "science_significance": "Capas sedimentarias de grano fino ricas en esmectitas y carbonatos. Alto potencial de preservación de biofirmas microbianas del antiguo lago Jezero.",
            "rover_mission": "Mars 2020 Perseverance"
        },
        {
            "name": "Canal de Entrada Neretva Vallis",
            "lat": 18.51,
            "lon": 77.30,
            "science_significance": "Afloramiento de conglomerados con cantos rodados transportados por inundaciones de alta energía hacia el lago.",
            "rover_mission": "Mars 2020 Perseverance"
        },
        {
            "name": "Contacto de Borde de Cráter (Crater Rim Breccia)",
            "lat": 18.58,
            "lon": 77.22,
            "science_significance": "Brechas de impacto profundas y basamento ígneo Noeico para calibración radiométrica de la cuenca Isidis.",
            "rover_mission": "Exploración humana propuesta"
        }
    ],
    "GALE_MOUNT_SHARP": [
        {
            "name": "Crestas Boxwork de Mount Sharp (Boxwork Formations)",
            "lat": -4.68,
            "lon": 137.40,
            "science_significance": "Estructuras minerales de fractura subterránea investigadas por Curiosity en 2024-2025. Evidencia de redes hidrotermales subterráneas habitables protegidas de la radiación.",
            "rover_mission": "MSL Curiosity"
        },
        {
            "name": "Contacto Transicional Arcilla-Sulfato (Clay-Sulfate Transition)",
            "lat": -4.75,
            "lon": 137.38,
            "science_significance": "Registro del gran cambio climático global de Marte: transición de un ambiente húmedo lacustre a condiciones áridas extremas.",
            "rover_mission": "MSL Curiosity"
        }
    ]
}

# Definición de herramientas para Bedrock Converse API
BEDROCK_TOOLS = [
    {
        "toolSpec": {
            "name": "calculate_mars_distance",
            "description": "Calcula la distancia de gran círculo en la superficie de Marte usando el radio medio oficial de Marte (3,389.5 km).",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "lat1": {"type": "number", "description": "Latitud planetocéntrica de origen en grados decimales (-90 a 90)"},
                        "lon1": {"type": "number", "description": "Longitud Este de origen en grados decimales (-180 a 180 o 0 a 360)"},
                        "lat2": {"type": "number", "description": "Latitud planetocéntrica de destino en grados decimales (-90 a 90)"},
                        "lon2": {"type": "number", "description": "Longitud Este de destino en grados decimales (-180 a 180 o 0 a 360)"}
                    },
                    "required": ["lat1", "lon1", "lat2", "lon2"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "lookup_mission_dataset",
            "description": "Consulta especificaciones técnicas verificadas y limitaciones de instrumentos y sensores de la NASA (ej. CTX, MOLA, THEMIS, HIRISE, CRISM, PERSEVERANCE_MASTCAMZ).",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "instrument_or_mission": {"type": "string", "description": "Acrónimo del sensor o misión"}
                    },
                    "required": ["instrument_or_mission"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "get_science_targets",
            "description": "Obtiene puntos de alto valor geológico y astrobiológico comprobados en Cráter Jezero o Cráter Gale / Monte Sharp (incluyendo formaciones boxwork).",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "region": {"type": "string", "description": "Región: 'JEZERO' o 'GALE_MOUNT_SHARP'", "enum": ["JEZERO", "GALE_MOUNT_SHARP"]}
                    },
                    "required": ["region"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "evaluate_eva_feasibility",
            "description": "Evalúa la viabilidad y seguridad de una caminata marciana considerando distancia total, modo (a pie o rover), pendiente y disponibilidad de DEM métrico.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "total_distance_km": {"type": "number", "description": "Distancia total estimada en km"},
                        "eva_mode": {"type": "string", "description": "'FOOT' (a pie) o 'ROVER' (asistido)", "enum": ["FOOT", "ROVER"]},
                        "estimated_slope_deg": {"type": "number", "description": "Pendiente máxima en grados (opcional)"},
                        "has_meter_scale_dem": {"type": "boolean", "description": "True si existe DEM de alta resolución (submétrico o 1-2 m)"}
                    },
                    "required": ["total_distance_km", "eva_mode"]
                }
            }
        }
    }
]


def haversine_mars(lat1: float, lon1: float, lat2: float, lon2: float) -> tuple[float, float]:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    diff_lon = (lon2 - lon1 + 180.0) % 360.0 - 180.0
    delta_lambda = math.radians(diff_lon)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))

    distance_km = MARS_MEAN_RADIUS_KM * c
    distance_meters = MARS_MEAN_RADIUS_METERS * c
    return round(distance_km, 3), round(distance_meters, 1)


def execute_tool(name: str, args: dict) -> dict:
    if name == "calculate_mars_distance":
        lat1 = float(args.get("lat1", 0.0))
        lon1 = float(args.get("lon1", 0.0))
        lat2 = float(args.get("lat2", 0.0))
        lon2 = float(args.get("lon2", 0.0))
        dist_km, dist_m = haversine_mars(lat1, lon1, lat2, lon2)
        return {
            "distance_km": dist_km,
            "distance_meters": dist_m,
            "mars_radius_used_km": MARS_MEAN_RADIUS_KM,
            "estimated_walk_duration_hours": round(dist_km / NOMINAL_WALK_SPEED_KMH, 2),
            "status": "CALCULATED_SPHERICAL_MARS_GEODESY"
        }
    elif name == "lookup_mission_dataset":
        key = str(args.get("instrument_or_mission", "")).strip().upper()
        matched = None
        for k in DATASET_CATALOG.keys():
            if k in key or key in k:
                matched = k
                break
        if not matched:
            if "CTX" in key: matched = "MRO_CTX"
            elif "HIRISE" in key: matched = "MRO_HIRISE"
            elif "MOLA" in key: matched = "MGS_MOLA"
            elif "THEMIS" in key: matched = "ODYSSEY_THEMIS"
            elif "CRISM" in key: matched = "MRO_CRISM"
            elif "PERSEVERANCE" in key or "MASTCAM" in key: matched = "PERSEVERANCE_MASTCAMZ"
        return DATASET_CATALOG.get(matched, {"error": "DATASET_NOT_FOUND", "query": key})

    elif name == "get_science_targets":
        reg = str(args.get("region", "JEZERO")).strip().upper()
        reg_key = "GALE_MOUNT_SHARP" if ("GALE" in reg or "SHARP" in reg or "BOXWORK" in reg) else "JEZERO"
        return {"region": reg_key, "targets": SCIENCE_TARGETS.get(reg_key, [])}

    elif name == "evaluate_eva_feasibility":
        total_km = float(args.get("total_distance_km", 0.0))
        eva_mode = str(args.get("eva_mode", "FOOT")).strip().upper()
        slope = float(args.get("estimated_slope_deg", 0.0)) if args.get("estimated_slope_deg") is not None else None
        has_dem = bool(args.get("has_meter_scale_dem", False))

        if eva_mode == "FOOT":
            feasibility = "FEASIBLE" if total_km <= 5.0 else ("CAUTION_EXTENDED" if total_km <= 8.0 else "UNFEASIBLE_WALKBACK_EXCEEDED")
            walkback = f"Radio a pie: {total_km} km (Límite nominal: 5.0 km, límite de emergencia: 8.0 km)."
        else:
            feasibility = "FEASIBLE_ROVER" if total_km <= 15.0 else "CAUTION_LONG_ROVER"
            walkback = f"Ruta con rover: {total_km} km."

        return {
            "feasibility": feasibility,
            "walkback_assessment": walkback,
            "slope_warning": "PENDIENTE_MAYOR_A_20_GRADOS_PELIGRO" if (slope and slope > 20) else "PENDIENTE_ACEPTABLE",
            "unassessed_hazards_note": "VERIFICADO_CON_DTM" if has_dem else "PELIGROS_SUBMETRICOS_NO_EVALUADOS_POR_FALTA_DE_DEM_METRICO"
        }
    return {"error": "UNKNOWN_TOOL", "tool": name}


def run_agentic_conversation(user_message: str, history: list = None) -> dict:
    """Ejecuta el bucle ReAct del Agente usando Amazon Bedrock Converse"""
    messages = []
    if history:
        for h in history:
            messages.append({"role": h.get("role", "user"), "content": [{"text": h.get("content", "")}]})
    messages.append({"role": "user", "content": [{"text": user_message}]})

    tool_config = {"tools": BEDROCK_TOOLS}
    system_config = [{"text": SYSTEM_PROMPT}]

    executed_tools = []
    
    # Bucle ReAct (máximo 4 iteraciones)
    for _ in range(4):
        response = bedrock_client.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=messages,
            system=system_config,
            toolConfig=tool_config,
            inferenceConfig={"temperature": 0.2, "maxTokens": 2048}
        )
        
        output_message = response["output"]["message"]
        messages.append(output_message)
        
        stop_reason = response.get("stopReason")
        if stop_reason == "tool_use":
            # Ejecutar herramientas invocadas por el modelo
            tool_results = []
            for block in output_message["content"]:
                if "toolUse" in block:
                    t_use = block["toolUse"]
                    t_name = t_use["name"]
                    t_input = t_use["input"]
                    t_id = t_use["toolUseId"]
                    
                    t_output = execute_tool(t_name, t_input)
                    executed_tools.append({"tool": t_name, "input": t_input, "output": t_output})
                    
                    tool_results.append({
                        "toolResult": {
                            "toolUseId": t_id,
                            "content": [{"json": t_output}]
                        }
                    })
            
            messages.append({
                "role": "user",
                "content": tool_results
            })
        else:
            # Respuesta final obtenida
            final_text = ""
            for block in output_message["content"]:
                if "text" in block:
                    final_text += block["text"]
            return {
                "reply": final_text,
                "model_used": BEDROCK_MODEL_ID,
                "tools_called": executed_tools
            }

    return {"reply": "Límite de iteraciones alcanzado.", "tools_called": executed_tools}


def lambda_handler(event, context):
    print(f"Incoming Event: {json.dumps(event)}")
    
    # Manejo de CORS OPTIONS
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": ""
        }

    # Invocación directa como Action Group (Bedrock Agent)
    if "actionGroup" in event and "apiPath" in event:
        api_path = event.get("apiPath", "")
        # Extraer parámetros
        params = {}
        if "parameters" in event and isinstance(event["parameters"], list):
            for p in event["parameters"]: params[p.get("name")] = p.get("value")
        rb = event.get("requestBody", {}).get("content", {}).get("application/json", {})
        if "properties" in rb:
            for p in rb["properties"]: params[p.get("name")] = p.get("value")

        tool_map = {
            "/calculate_mars_distance": "calculate_mars_distance",
            "/lookup_mission_dataset": "lookup_mission_dataset",
            "/get_science_targets": "get_science_targets",
            "/evaluate_eva_feasibility": "evaluate_eva_feasibility"
        }
        t_name = tool_map.get(api_path, "")
        t_res = execute_tool(t_name, params)
        return {
            "messageVersion": "1.0",
            "response": {
                "actionGroup": event.get("actionGroup"),
                "apiPath": api_path,
                "httpMethod": event.get("httpMethod", "POST"),
                "httpStatusCode": 200,
                "responseBody": {"application/json": {"body": json.dumps(t_res, ensure_ascii=False)}}
            }
        }

    # Invocación como Chatbot HTTP (Function URL o API Gateway)
    body_raw = event.get("body", "")
    body = {}
    if isinstance(body_raw, str) and body_raw:
        try: body = json.loads(body_raw)
        except Exception: body = {"message": body_raw}
    elif isinstance(body_raw, dict):
        body = body_raw
    elif "message" in event:
        body = event

    user_msg = body.get("message") or body.get("prompt", "Hola")
    history = body.get("history", [])

    agent_result = run_agentic_conversation(user_msg, history)

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(agent_result, ensure_ascii=False)
    }
