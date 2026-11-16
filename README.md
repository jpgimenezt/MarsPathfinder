# AresRoute — Interplanetary Survival Guide: Martian Map

NASA Space Apps Challenge 2026 · Interactive Multimodal Mission Planning Platform  
Independent educational and scientific research prototype. Not certified for flight or human surface operations.

Production Deployment: [https://aresroute.vercel.app/](https://aresroute.vercel.app/) (Alternative alias: [https://ares-route.vercel.app](https://ares-route.vercel.app))  
Repository: [https://github.com/jpgimenezt/MarsPathfinder](https://github.com/jpgimenezt/MarsPathfinder)  
Primary Branch: `main`

---

## 1. Executive Summary & Mission Overview

AresRoute is an exploratory mission planning platform designed for the NASA Space Apps Challenge 2026 challenge *Interplanetary Survival Guide: Martian Map*. The system addresses a fundamental operational question:

> How can an astronaut or extravehicular activity (EVA) planner evaluate human surface exploration in scientifically rich Martian regions while understanding the limits, uncertainties, and hazards inferred from multi-mission orbital and surface data?

### Core Scientific & Engineering Principles

1. **Science Over Spectacle**: Visual representations must reflect audited observations and documented mathematical models rather than aesthetic approximations.
2. **Strict Scientific Provenance**: Every layer, metric, elevation profile, and conclusion explicitly states its originating mission, instrument, product ID, horizontal resolution, vertical datum, and known limitations. Data states are categorized as:
   * `OBSERVED`: Raw or orthorectified measurements from spacecraft instruments.
   * `HISTORICAL`: Validated multi-year archival datasets.
   * `DERIVED`: Mathematically processed representations (such as slope grids or shaded relief).
   * `MODELED`: Numerical approximations with explicit scientific assumptions.
   * `SIMULATED`: Procedural or conceptual models for educational visualization.
   * `UNAVAILABLE` / `NO_DATA`: Regions lacking sufficient observational coverage.
3. **Martian Geodesy**: Distances, bearings, and geometries are strictly computed using the mean radius of Mars ($R_m = 3\,389\,500\text{ m}$) over great-circle spherical models. Terrestrial WGS84 parameters are never used for Martian distance calculations.
4. **Transparent Risk Assessment**: Routes are designated as "exploratory plans with detected constraints." Paths are never marked as unconditionally "safe" because orbital resolutions cannot resolve sub-meter rocks, regolith bearing capacity, or real-time atmospheric hazards.

---

## 2. Functional Architecture & Core Capabilities

AresRoute integrates three spatial scales and two AI engines into a unified operational console:

```text
+-----------------------------------------------------------------------------------+
|                                  AresRoute Web Console                            |
|                                                                                   |
|  +---------------------------------+  +----------------------------------------+  |
|  |     2D Jezero Tactical Map      |  |         Gale Crater 3D Environment     |  |
|  |   - OpenLayers GIS (EPSG:104905)|  |   - Three.js Local Procedural Surface  |  |
|  |   - MRO CTX (5 m/px) WMTS       |  |   - Mount Sharp & Bradbury Landing     |  |
|  |   - MGS MOLA Relief (463 m/px)  |  |   - Curiosity MSL Traverse Comparison  |  |
|  |   - Odyssey THEMIS IR (100 m/px)|  |   - Conceptual Alpha Base Habitat      |  |
|  |   - USGS 80m DEM A* Pathfinder  |  |   - Educational Model Disclaimers      |  |
|  +---------------------------------+  +----------------------------------------+  |
|                                                                                   |
|  +---------------------------------+  +----------------------------------------+  |
|  |      3D Global Mars Navigator   |  |        Scientific Data Center          |  |
|  |   - Three.js Planetocentric     |  |   - Dataset Provenance Registry        |  |
|  |   - MOLA Relief / Viking MDIM2.1|  |   - Surface Intelligence Catalog       |  |
|  |   - Regional Deep-Link Markers  |  |   - Perseverance & Curiosity Photos    |  |
|  +---------------------------------+  +----------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                     ARES Mission Comms (Multimodal AI)                      |  |
|  |   - Voice: Amazon Nova 2.5 Sonic (Speech-to-Speech via ECS Fargate Gateway) |  |
|  |   - Reasoning: Amazon Bedrock Nova Pro (Serverless AWS Lambda Function)     |  |
|  |   - Offline Contingency: Web Speech API + Client-Side Knowledge Engine      |  |
|  |   - Tool Execution Engine: Camera, Layers, Waypoints, Provenance Lookups    |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 2.1 Interactive 3D Mars Navigation Globe
* **Technology**: Three.js WebGL rendering with OrbitControls, touch gestures, and keyboard navigation.
* **Basemaps**: Interactive switching between MGS MOLA color-shaded relief and Viking MDIM 2.1 colorized global mosaics.
* **Geographic Integration**: Planetocentric coordinates with East longitude conventions ($-180^\circ \dots 180^\circ$ and $0^\circ \dots 360^\circ$).
* **Deep-Link Targets**: Direct transitions to Jezero Crater ($18.38^\circ\text{N}, 77.45^\circ\text{E}$) and Gale Crater ($4.59^\circ\text{S}, 137.44^\circ\text{E}$).

### 2.2 2D Jezero Crater Exploratory Map & Terrain Pathfinder
* **GIS Engine**: OpenLayers 10 with custom planetocentric projection handling (`urn:ogc:def:crs:EPSG::104905`).
* **Multi-Mission NASA WMTS Integration**:
  * **MRO CTX**: Context Camera controlled mosaic at $5\text{--}6\text{ m/pixel}$.
  * **MGS MOLA**: Mars Orbiter Laser Altimeter visual shaded relief at $463\text{ m/pixel}$.
  * **Odyssey THEMIS**: Thermal Emission Imaging System daytime infrared mosaic at $100\text{ m/pixel}$.
  * **Viking MDIM 2.1**: NASA Ames / USGS global colorized context mosaic at $232\text{ m/pixel}$.
* **Audited Footprint**: Certified opaque CTX bounding box `[77.164°E, 18.215°N, 77.695°E, 18.717°N]` validated through automated tile audits.
* **Interactive Waypoints**: Set, drag, undo, and reset markers A (Start/Base), P (Scientific Stop), and B (Destination).
* **Numerical DEM A\* Route Planning**:
  * Utilizes an offline-prepared binary grid (`jezero-dem-80m.bin`, $80\text{ m}$ cell size derived from the USGS Mars 2020 CTX DEM mosaic).
  * Executes non-blocking route searches inside a Web Worker.
  * Generates three exploratory alternatives:
    1. **Shortest Distance**: Minimizes total Martian horizontal meters.
    2. **Balanced Path**: Optimized trade-off between elevation change and distance.
    3. **Minimum Slope Exposure**: Prioritizes lowest gradients, routing around scarp edges and crater slopes.
  * Slope risk bands: Favorable ($\le 5^\circ$, green), Caution ($5^\circ\text{--}10^\circ$, yellow), Elevated Risk ($> 10^\circ$, red), and Unassessed/Nodata tranches (dashed black).
  * Manual reference path remains visible for side-by-side comparison with algorithmic proposals.

### 2.3 Gale Crater 3D Tactical & Educational Environment
* **Terrain Reconstruction**: 3D mesh generated from mathematical profiles of Gale Crater and Mount Sharp (Aeolis Mons), clearly labeled as an approximate educational model rather than a certified operational DEM.
* **Curiosity MSL Traverse Comparison**: Side-by-side visualization of Curiosity's historical path (Sols 0 to 3200+) versus prospective astronaut EVA traverse corridors.
* **Conceptual Human Habitat**: 3D structural model of candidate Base Bradbury (LZ-1) with power systems, life-support modules, and science bays.
* **Camera Modes**: Free orbit, surface panorama, orbital overlook, and EDL descent simulation.

### 2.4 ARES Mission Comms — Multimodal Tactical AI
AresRoute features a hybrid conversational architecture designed to maintain operational capability both online and under network-constrained conditions:

* **Voice Engine (Amazon Nova 2.5 Sonic)**:
  * Full-duplex speech-to-speech streaming via a dedicated WebSocket Gateway.
  * AudioWorklet downsampling from client hardware rate to $16\text{ kHz}$ PCM input, with $24\text{ kHz}$ synthesized PCM output.
  * Real-time 60 FPS Web Audio API FFT visualizer and acoustic RMS meters.
  * Natural speech barge-in (interruption) detection with turn-completion safeguards.
* **Reasoning Engine (Amazon Bedrock Nova Pro)**:
  * Serverless AWS Lambda backend (`aresroute-martian-tools`) exposed via AWS Lambda Function URL.
  * ReAct tool execution engine capable of executing interface commands: focusing camera, toggling scientific layers, creating mission waypoints, querying dataset provenance, and reviewing habitat telemetry.
* **Resilient Client-Side Engine**:
  * Sub-50ms query resolver for documented mission science (Curiosity discoveries, Mount Sharp boxwork structures, Jezero delta deposits).
  * Web Speech API (`SpeechRecognition` and `speechSynthesis`) fallback when cloud WebSocket connections are unavailable.
  * Smart priority audio gate that silences browser TTS when Nova Sonic streaming is online to eliminate acoustic feedback.
* **Bilingual English / Spanish Support**:
  * Real-time language switching on demand ("Switch to English" / "Cambiar a español").
  * Acoustic phonetic repair for Mars terminology (corrects speech recognition artifacts like "la capa mamá" into "capa mosaico CTX").

### 2.5 Walnut Mars Design System
* High-contrast aerospace cockpit theme developed specifically for planetary mission planning:
  * **Espresso (`#15100e`)**: Deep background providing high contrast for orbital imagery.
  * **Smoked Walnut (`#241a16` / `#35271f`)**: Elevated tactile panels and control docks.
  * **Aged Copper (`#c99a70` / `#f2d0ac`)**: Interactive borders, telemetry glow, and radar reticles.
  * **Parchment (`#f7ede0`)**: Primary high-legibility typographic scale.
* WCAG 2.1 AA compliant text contrast across desktop, tablet, and mobile screens.

---

## 3. Scientific Data Sources & Provenance Registry

| Dataset / Product Name | Mission / Instrument | Resolution | Origin / Provider | Status | Usage in AresRoute |
|---|---|---|---|---|---|
| CTX Controlled Mosaic | MRO / Context Camera | 5–6 m/px | NASA / JPL / Caltech / MSSS / USGS | `OBSERVED` | 2D high-resolution surface imagery in Jezero Crater |
| MOLA Color Shaded Relief | MGS / Laser Altimeter | 463 m/px | NASA / GSFC / USGS Astrogeology | `OBSERVED` | Global 3D relief texture and regional topographic context |
| THEMIS Daytime Infrared | Mars Odyssey / THEMIS | 100 m/px | NASA / JPL / Arizona State University | `OBSERVED` | Regional thermal inertia and surface material discrimination |
| Viking MDIM 2.1 Colorized | Viking Orbiter 1 & 2 | 232 m/px | NASA Ames / USGS Astrogeology | `HISTORICAL` | Global visual reference texture for 3D globe and 2D basemap |
| Mars 2020 CTX DEM Mosaic | MRO CTX / USGS Processing | 80 m (grid) | USGS Astrogeology Science Center | `DERIVED` | Web Worker binary elevation grid for A* slope calculations |
| MSL Traverse & Sols History | Curiosity Rover (MSL) | Metric points | NASA / JPL-Caltech | `OBSERVED` | Sols 0–3200+ traverse verification and waypoint comparison |
| Mars 2020 Science Objectives | Perseverance Rover | Regional | NASA Science Mission Directorate | `OBSERVED` | Jezero Delta astrobiological stop context and science citations |
| Gale 3D Procedural Mesh | Mathematical Model | N/A | AresRoute Engineering | `SIMULATED` | Educational visualization of crater relief; not an operational DEM |

---

## 4. System Architecture & Cloud Infrastructure

AresRoute is architected as an edge-delivered static frontend backed by AWS serverless compute and containerized streaming services:

```text
[ Browser / Astronaut Client ]
       |
       +--- HTTPS -------------------------> [ Vercel Edge Network ] (React + Vite SPA)
       |
       +--- HTTPS (CORS POST) -------------> [ AWS Lambda Function URL ]
       |                                           |
       |                                           +---> [ Amazon Bedrock: Nova Pro ]
       |
       +--- WSS (Secure WebSocket) --------> [ Amazon CloudFront ] (*.cloudfront.net SSL)
                                                   |
                                                   +---> [ Application Load Balancer ] (Port 80)
                                                               |
                                                               +---> [ AWS ECS Fargate Task ] (Node.js)
                                                                           |
                                                                           +---> [ Amazon Bedrock: Nova Sonic ]
```

### Production Endpoints
* **Web Application**: `https://aresroute.vercel.app/` (Alternative alias: `https://ares-route.vercel.app`)

---

## 5. Step-by-Step Local Setup & Execution Guide

### Prerequisites
* **Node.js**: Version 22 LTS or higher.
* **npm**: Version 10 or higher.
* **Docker Desktop**: Optional, required only for building and running the containerized Voice Gateway.
* **AWS CLI**: Optional, required only for deploying infrastructure to AWS.

### 5.1 Clone the Repository
```bash
git clone https://github.com/jpgimenezt/MarsPathfinder.git
cd MarsPathfinder
git checkout main
```

### 5.2 Configure Environment Variables
Create a `.env.local` file in the project root:

```bash
# Frontend Environment Configuration (set in Vercel or local .env.local)
VITE_AWS_AGENT_ENDPOINT=https://<your-lambda-url-id>.lambda-url.us-east-2.on.aws/
VITE_VOICE_GATEWAY_URL=wss://<your-voice-gateway-domain>/voice
```

To test the Voice Gateway locally via WebSocket, you can set:
```bash
# Local development override
VITE_VOICE_GATEWAY_URL=ws://localhost:8088/voice
```

### 5.3 Install Dependencies
```bash
npm ci
```

### 5.4 Run the Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

### 5.5 Run the Voice Gateway Locally (Optional)
To run the local Amazon Nova 2.5 Sonic speech gateway:

1. Ensure AWS credentials with Bedrock access in `us-west-2` are configured in your environment:
   ```bash
   export AWS_REGION=us-west-2
   export AWS_ACCESS_KEY_ID=<your-access-key>
   export AWS_SECRET_ACCESS_KEY=<your-secret-key>
   ```
2. Build and start the gateway service:
   ```bash
   npm run build:gateway
   npm run start:gateway
   ```
   The WebSocket endpoint will listen on `ws://localhost:8088/voice` and HTTP health checks on `http://localhost:8088/health`.

### 5.6 Execute Quality Assurance Checks
Run the complete automated test suite and build verification:

```bash
# Typecheck TypeScript definitions
npm run typecheck

# Run Vitest test suite (29 files, 147 test cases)
npm test

# Build production client bundle
npm run build

# Build production Voice Gateway bundle
npm run build:gateway
```

---

## 6. Cloud Deployment Guide

### 6.1 Frontend Deployment on Vercel
1. Install the Vercel CLI and authenticate:
   ```bash
   npm install -g vercel
   vercel login
   ```
2. Link the project and set environment variables:
   ```bash
   vercel link
   vercel env add VITE_AWS_AGENT_ENDPOINT production
   vercel env add VITE_VOICE_GATEWAY_URL production
   ```
3. Deploy to production:
   ```bash
   vercel deploy --prod
   ```

### 6.2 AWS Backend Lambda (Bedrock Nova Pro)
The serverless agent is configured via AWS SAM in `aws-agent/template.yaml`:
```bash
cd aws-agent
sam build
sam deploy --guided
```
The deployment outputs an active Function URL with CORS preflight handlers enabled for `https://aresroute.vercel.app`, `https://ares-route.vercel.app` and local development origins.

### 6.3 AWS Voice Gateway (ECS Fargate + CloudFront)
1. **Authenticate Docker with Amazon ECR**:
   ```bash
   aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-2.amazonaws.com
   ```
2. **Build and Push the Container**:
   ```bash
   docker build --platform linux/amd64 -f voice-gateway/Dockerfile -t <account-id>.dkr.ecr.us-east-2.amazonaws.com/ares-voice-gateway:latest .
   docker push <account-id>.dkr.ecr.us-east-2.amazonaws.com/ares-voice-gateway:latest
   ```
3. **Deploy Task & Service on ECS**:
   ```bash
   aws ecs register-task-definition --cli-input-json file://voice-gateway/task-definition.json --region us-east-2
   aws ecs update-service --cluster aresroute-cluster --service ares-voice-gateway-service --force-new-deployment --region us-east-2
   ```
4. **CloudFront WSS Distribution**:
   CloudFront forwards WebSocket handshakes (`Upgrade: websocket`) to the Application Load Balancer using the managed `AllViewer` origin request policy and `CachingDisabled` cache policy, terminating SSL/TLS with AWS wildcard certificates for browser compatibility.

---

## 7. Verification & Automated Test Suite

AresRoute maintains an automated Vitest test suite covering 29 test files and 147 test cases:

* **Geodesic Validation**: Verifies that Martian surface distances use the spherical radius $R_m = 3\,389\,500\text{ m}$, zero distance between identical coordinates, robust longitude wrapping across the antimeridian, and error bounds against terrestrial ellipsoids.
* **DEM A\* Pathfinder**: Validates slope cost computations, non-traversable slope rejections ($> 20^\circ$), nodata fallback handling, and deterministic alternative generation.
* **Tool Execution Engine**: Validates parameter schemas with Zod, checks security levels (Level 1 Query, Level 2 Visual, Level 3 Waypoint Mutation, Level 4 Simulation Contingency), and tests bilingual confirmation prompts.
* **Audio & Voice Pipeline**: Validates AudioWorklet PCM downsampling, barge-in wake word phonetic matching, and audio metric smoothing.
* **WMTS Tile Parsers**: Validates GetCapabilities XML parsing, TileMatrixSet identification, and error recovery on network timeouts.

---

## 8. NASA Space Apps Challenge 2026 Assessment Alignment

| Judging Criteria | Implementation in AresRoute |
|---|---|
| **Impact** | Transforms disparate orbital datasets into an actionable planning tool for human Mars exploration. Enables mission planners to visualize terrain friction, slope hazards, and scientific objectives simultaneously. |
| **Creativity** | Unifies 2D audited GIS, an interactive 3D navigation globe, a procedural 3D surface simulator, and a full-duplex speech-to-speech AI copilot powered by Amazon Nova models. |
| **Validity** | Implements strict data provenance. Distinguishes observed imagery from procedural relief. Uses Martian geodesy ($R_m = 3\,389\,500\text{ m}$) instead of Earth defaults. Never falsely labels routes as "safe". |
| **Relevance** | Directly targets the challenge requirements: multi-mission NASA data integration (CTX, MOLA, THEMIS, Viking, Curiosity, Perseverance), obstacle awareness, scientific value evaluation, and human EVA planning. |
| **Presentation** | Professional, accessible aerospace cockpit console (Walnut Mars design system) with responsive desktop/mobile layouts, bilingual EN/ES support, and live public deployment. |

---

## 9. Disclaimer & Citations

### Operational Disclaimer
AresRoute is an independent educational and research prototype created for the NASA Space Apps Challenge 2026. It is not affiliated with, endorsed by, or certified by NASA, JPL, or USGS. It must not be used for terrestrial or extraterrestrial flight, navigation, life-support operations, or physical safety evaluations.

### Data Acknowledgments
* **NASA / JPL-Caltech**: Mars Reconnaissance Orbiter (CTX), Mars Global Surveyor (MOLA), Mars Odyssey (THEMIS), Mars Science Laboratory (Curiosity), and Mars 2020 (Perseverance).
* **USGS Astrogeology Science Center**: Planetary GIS data, MOLA global color-shaded relief maps, Viking MDIM 2.1 colorized mosaics, and CTX orthorectified products.
* **NASA Mars Trek**: Web Map Tile Services (WMTS) for planetary cartographic delivery.
