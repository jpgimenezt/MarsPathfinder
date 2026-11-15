/**
 * ARES — Constructor 3D de Infraestructura y Hábitat Humano en Marte
 * Ensambla modelos tridimensionales hiperrealistas de ingeniería aeroespacial con materiales PBR:
 * - Módulo de Aterrizaje y Ascenso (HLS) con patas hidráulicas, toberas de metilox, láminas Kapton MLI y grúa de carga
 * - Hábitat Central (Hab Core Alfa) con berma 3D de regolito estratificado, cúpula TransHab y torre de comunicaciones
 * - Invernadero Bioregenerativo (CELSS) con bóveda ETFE translúcida, torres verticales de cultivo y luces LED fotosintéticas
 * - Laboratorio Científico con brazo robótico articulado, esclusa de muestras y antena parabólica de espacio profundo
 * - Módulo Logístico con compuertas suitport traseras para trajes mEMU y tanques criogénicos de O2/N2
 * - Planta Solar Fotovoltaica con 6 alas de células de silicio/GaAs con barras colectoras y subestación de baterías
 * - Planta ISRU con reactor de electrólisis SOXE, ciclones de filtración de CO2 y esfera criogénica de LOX
 * - Rover Presurizado 6x6 con suspensión oscilante rocker-bogie y ruedas de malla elástica con dibujo chevron
 * - Astronautas a escala humana (1.8 m) con traje de exploración mEMU, visor dorado reflectante y mochila PLSS
 */

import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import {
  createCarbonFiberTexture,
  createCropsTexture,
  createHullPanelsTexture,
  createKaptonMliTexture,
  createRegolithBermTexture,
  createSolarCellTexture,
  createTireTreadTexture,
} from './colonyTextures'
import {
  DEFAULT_COLONY_MODULES,
} from './colonyCatalog'

export interface ColonyBuilderOptions {
  getTerrainHeight: (x: number, z: number) => number
  centerTerrainPos: { x: number; z: number }
  scale?: number
}

/**
 * Aplica configuración de sombras consistente a cualquier malla
 */
function applyShadows(mesh: Mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
}

/**
 * Construye el conjunto tridimensional completo de la colonia marciana Base Alfa.
 */
export function buildColony3DGroup(options: ColonyBuilderOptions): Group {
  const { getTerrainHeight, centerTerrainPos, scale = 1.0 } = options
  const colonyRoot = new Group()
  colonyRoot.name = 'ares-mars-colony-root'

  // Texturas procedurales PBR generadas dinámicamente
  const texKapton = createKaptonMliTexture()
  const texSolar = createSolarCellTexture()
  const texHull = createHullPanelsTexture()
  const texCarbon = createCarbonFiberTexture()
  const texTire = createTireTreadTexture()
  const texBerm = createRegolithBermTexture()
  const texCrops = createCropsTexture()

  // Materiales PBR optimizados para luz rasante marciana
  const matWhiteHull = new MeshStandardMaterial({
    color: 0xf8fafc,
    map: texHull || null,
    metalness: 0.65,
    roughness: 0.32,
  })

  const matGoldMli = new MeshStandardMaterial({
    color: 0xd97706,
    map: texKapton || null,
    metalness: 0.95,
    roughness: 0.22,
  })

  const matSolarCell = new MeshStandardMaterial({
    color: 0x172554,
    map: texSolar || null,
    metalness: 0.88,
    roughness: 0.15,
  })

  const matGlassGreenhouse = new MeshStandardMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.48,
    roughness: 0.08,
    metalness: 0.2,
    side: DoubleSide,
  })

  const matCropsGlow = new MeshStandardMaterial({
    color: 0x10b981,
    map: texCrops || null,
    emissive: 0x047857,
    emissiveIntensity: 0.6,
    roughness: 0.45,
  })

  const matMetalFrame = new MeshStandardMaterial({
    color: 0x334155,
    map: texCarbon || null,
    metalness: 0.85,
    roughness: 0.35,
  })

  const matEngineNozzle = new MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.95,
    roughness: 0.2,
  })

  const matRegolithBerm = new MeshStandardMaterial({
    color: 0x9a3412,
    map: texBerm || null,
    roughness: 0.92,
    metalness: 0.08,
  })

  const matRoverTire = new MeshStandardMaterial({
    color: 0x1e293b,
    map: texTire || null,
    metalness: 0.8,
    roughness: 0.4,
  })

  const matVisorGold = new MeshStandardMaterial({
    color: 0xf59e0b,
    map: texKapton || null,
    metalness: 0.98,
    roughness: 0.1,
  })

  const matBlackTilesTPS = new MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.7,
    metalness: 0.3,
  })

  const matLightCyan = new MeshBasicMaterial({
    color: 0x00f0ff,
  })

  const matLightAmber = new MeshBasicMaterial({
    color: 0xf59e0b,
  })

  // Generar cada módulo del catálogo
  DEFAULT_COLONY_MODULES.forEach((mod) => {
    const meterToUnit = 0.12 * scale
    const worldX = centerTerrainPos.x + mod.offsetMeters.east * meterToUnit
    const worldZ = centerTerrainPos.z - mod.offsetMeters.north * meterToUnit
    const groundY = getTerrainHeight(worldX, worldZ)

    // Elevación de cimentación ingenieril (+0.85m) para prevenir enterramiento por pendiente o z-fighting
    const foundationClearance = 0.85 * meterToUnit

    const moduleGroup = new Group()
    moduleGroup.name = `colony-module-${mod.id}`
    moduleGroup.position.set(worldX, groundY + foundationClearance, worldZ)
    moduleGroup.rotation.y = (mod.rotationDeg * Math.PI) / 180
    moduleGroup.userData = { moduleData: mod }

    // Plataforma de nivelación y cimentación geotécnica al regolito
    const padRadius = Math.max(3.2, (mod.dimensions.widthMeters / 2 + 1.2)) * meterToUnit
    const foundationPadGeo = new CylinderGeometry(padRadius, padRadius * 1.04, 0.65 * meterToUnit, 12)
    foundationPadGeo.translate(0, -0.32 * meterToUnit, 0)
    const foundationPad = new Mesh(foundationPadGeo, matMetalFrame)
    applyShadows(foundationPad)
    moduleGroup.add(foundationPad)

    // Pilares telescópicos de anclaje hidráulico que compensan pendientes del terreno
    const stiltCount = mod.type === 'landing' ? 8 : 6
    for (let p = 0; p < stiltCount; p++) {
      const pAngle = (p * Math.PI * 2) / stiltCount
      const px = Math.cos(pAngle) * (padRadius * 0.88)
      const pz = Math.sin(pAngle) * (padRadius * 0.88)
      const stiltGeo = new CylinderGeometry(0.14 * meterToUnit, 0.18 * meterToUnit, 1.8 * meterToUnit, 6)
      stiltGeo.translate(px, -1.0 * meterToUnit, pz)
      const stiltMesh = new Mesh(stiltGeo, matMetalFrame)
      applyShadows(stiltMesh)
      moduleGroup.add(stiltMesh)

      // Zapata pesada de anclaje
      const footGeo = new CylinderGeometry(0.35 * meterToUnit, 0.42 * meterToUnit, 0.22 * meterToUnit, 8)
      footGeo.translate(px, -1.8 * meterToUnit, pz)
      const footMesh = new Mesh(footGeo, matMetalFrame)
      applyShadows(footMesh)
      moduleGroup.add(footMesh)
    }

    switch (mod.type) {
      case 'landing': {
        // --- 1. MÓDULO DE ATERRIZAJE Y ASCENSO (HLS MARS STARSHIP) ---
        // Plataforma octogonal de aterrizaje con deflectores de llama y canal de escape
        const padGeo = new CylinderGeometry(7.8 * meterToUnit, 8.4 * meterToUnit, 0.45 * meterToUnit, 8)
        padGeo.translate(0, 0.22 * meterToUnit, 0)
        const padMesh = new Mesh(padGeo, matMetalFrame)
        applyShadows(padMesh)
        moduleGroup.add(padMesh)

        // Anillo de iluminación perimetral para aproximación nocturna
        const padRingGeo = new RingGeometry(7.2 * meterToUnit, 7.5 * meterToUnit, 16)
        padRingGeo.rotateX(-Math.PI / 2)
        const padRingMesh = new Mesh(padRingGeo, matLightCyan)
        padRingMesh.position.y = 0.46 * meterToUnit
        moduleGroup.add(padRingMesh)

        // Marcadores de orientación táctica en la plataforma
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4
          const mX = Math.cos(angle) * 7.3 * meterToUnit
          const mZ = Math.sin(angle) * 7.3 * meterToUnit
          const pLightGeo = new SphereGeometry(0.18 * meterToUnit, 6, 6)
          pLightGeo.translate(mX, 0.48 * meterToUnit, mZ)
          const pLightMesh = new Mesh(pLightGeo, i % 2 === 0 ? matLightCyan : matLightAmber)
          moduleGroup.add(pLightMesh)
        }

        // Etapa de descenso octogonal envuelta en aislamiento térmico Kapton MLI dorado
        const descentGeo = new CylinderGeometry(4.2 * meterToUnit, 4.6 * meterToUnit, 4.5 * meterToUnit, 8)
        descentGeo.translate(0, (0.45 + 2.25) * meterToUnit, 0)
        const descentMesh = new Mesh(descentGeo, matGoldMli)
        applyShadows(descentMesh)
        moduleGroup.add(descentMesh)

        // 4 Motores cohete de retropropulsión (Toberas con aros de enfriamiento regenerativo)
        for (let e = 0; e < 4; e++) {
          const eAngle = (e * Math.PI) / 2 + Math.PI / 4
          const ex = Math.cos(eAngle) * 1.8 * meterToUnit
          const ez = Math.sin(eAngle) * 1.8 * meterToUnit
          const nozzleGeo = new CylinderGeometry(0.35 * meterToUnit, 0.85 * meterToUnit, 1.4 * meterToUnit, 12)
          nozzleGeo.translate(ex, (0.45 + 0.7) * meterToUnit, ez)
          const nozzleMesh = new Mesh(nozzleGeo, matEngineNozzle)
          applyShadows(nozzleMesh)
          moduleGroup.add(nozzleMesh)
        }

        // 4 Bloques RCS de maniobra orbital y control de actitud (4 toberas cada uno)
        for (let r = 0; r < 4; r++) {
          const rAngle = (r * Math.PI) / 2
          const rx = Math.cos(rAngle) * 4.4 * meterToUnit
          const rz = Math.sin(rAngle) * 4.4 * meterToUnit
          const rcsGeo = new BoxGeometry(0.4 * meterToUnit, 0.4 * meterToUnit, 0.4 * meterToUnit)
          rcsGeo.translate(rx, (0.45 + 4.2) * meterToUnit, rz)
          const rcsMesh = new Mesh(rcsGeo, matMetalFrame)
          applyShadows(rcsMesh)
          moduleGroup.add(rcsMesh)
        }

        // 4 Patas de aterrizaje articuladas de alta resistencia con zapatas basculantes
        for (let i = 0; i < 4; i++) {
          const legAngle = (i * Math.PI) / 2 + Math.PI / 4
          const legGroup = new Group()
          legGroup.rotation.y = legAngle

          // Puntal telescópico principal oleo-neumático
          const strutGeo = new CylinderGeometry(0.24 * meterToUnit, 0.2 * meterToUnit, 5.2 * meterToUnit, 8)
          strutGeo.rotateZ(Math.PI / 5.2)
          strutGeo.translate(2.3 * meterToUnit, 2.1 * meterToUnit, 0)
          const strutMesh = new Mesh(strutGeo, matMetalFrame)
          applyShadows(strutMesh)
          legGroup.add(strutMesh)

          // Brazo articulado secundario en tijera (amortiguador de deformación)
          const braceGeo = new CylinderGeometry(0.12 * meterToUnit, 0.12 * meterToUnit, 3.2 * meterToUnit, 6)
          braceGeo.rotateZ(-Math.PI / 4.5)
          braceGeo.translate(1.8 * meterToUnit, 1.2 * meterToUnit, 0)
          const braceMesh = new Mesh(braceGeo, matMetalFrame)
          applyShadows(braceMesh)
          legGroup.add(braceMesh)

          // Zapata hexagonal autocalibrable de penetración de regolito
          const footGeo = new CylinderGeometry(0.95 * meterToUnit, 1.1 * meterToUnit, 0.28 * meterToUnit, 6)
          footGeo.translate(4.3 * meterToUnit, 0.14 * meterToUnit, 0)
          const footMesh = new Mesh(footGeo, matMetalFrame)
          applyShadows(footMesh)
          legGroup.add(footMesh)

          moduleGroup.add(legGroup)
        }

        // Etapa de ascenso / Cabina presurizada de tripulación (Casco blanco con paneles)
        const ascentGeo = new CylinderGeometry(3.6 * meterToUnit, 4.0 * meterToUnit, 8.8 * meterToUnit, 24)
        ascentGeo.translate(0, (4.95 + 4.4) * meterToUnit, 0)
        const ascentMesh = new Mesh(ascentGeo, matWhiteHull)
        applyShadows(ascentMesh)
        moduleGroup.add(ascentMesh)

        // Escudo térmico de losetas negras de reingreso (TPS cerámico en flanco de barlovento)
        const tpsGeo = new CylinderGeometry(3.62 * meterToUnit, 4.02 * meterToUnit, 8.8 * meterToUnit, 16, 1, false, 0, Math.PI)
        tpsGeo.translate(0, (4.95 + 4.4) * meterToUnit, 0)
        const tpsMesh = new Mesh(tpsGeo, matBlackTilesTPS)
        applyShadows(tpsMesh)
        moduleGroup.add(tpsMesh)

        // Cono de proa aerodinámico
        const noseGeo = new SphereGeometry(3.6 * meterToUnit, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
        noseGeo.translate(0, (4.95 + 8.8) * meterToUnit, 0)
        const noseMesh = new Mesh(noseGeo, matWhiteHull)
        applyShadows(noseMesh)
        moduleGroup.add(noseMesh)

        // Ventanas de puente de vuelo / cabina de pilotaje
        for (let w = -0.8; w <= 0.8; w += 1.6) {
          const winGeo = new BoxGeometry(0.7 * meterToUnit, 0.6 * meterToUnit, 0.1 * meterToUnit)
          winGeo.translate(w * meterToUnit, (4.95 + 7.5) * meterToUnit, 3.8 * meterToUnit)
          const winMesh = new Mesh(winGeo, matGlassGreenhouse)
          moduleGroup.add(winMesh)
        }

        // Grúa y plataforma elevadora de carga y rovers (Torno y cables)
        const craneRailGeo = new BoxGeometry(0.3 * meterToUnit, 11.5 * meterToUnit, 0.3 * meterToUnit)
        craneRailGeo.translate(3.85 * meterToUnit, 6.2 * meterToUnit, 0)
        const craneRail = new Mesh(craneRailGeo, matMetalFrame)
        applyShadows(craneRail)
        moduleGroup.add(craneRail)

        const liftBasketGeo = new BoxGeometry(2.2 * meterToUnit, 0.2 * meterToUnit, 2.2 * meterToUnit)
        liftBasketGeo.translate(4.8 * meterToUnit, 1.2 * meterToUnit, 0)
        const liftBasket = new Mesh(liftBasketGeo, matMetalFrame)
        applyShadows(liftBasket)
        moduleGroup.add(liftBasket)

        // Rampa de desembarco articulada
        const rampGeo = new BoxGeometry(1.6 * meterToUnit, 0.15 * meterToUnit, 6.8 * meterToUnit)
        rampGeo.rotateX(Math.PI / 6)
        rampGeo.translate(0, 1.7 * meterToUnit, 5.2 * meterToUnit)
        const rampMesh = new Mesh(rampGeo, matMetalFrame)
        applyShadows(rampMesh)
        moduleGroup.add(rampMesh)
        break
      }

      case 'habitat': {
        // --- 2. HÁBITAT PRINCIPAL (HAB CORE ALFA) ---
        // Anillo de regolito protector (berma de 3D-printing contra radiación y micrometeoritos)
        const bermGeo = new TorusGeometry(5.8 * meterToUnit, 1.5 * meterToUnit, 12, 32)
        bermGeo.rotateX(Math.PI / 2)
        bermGeo.translate(0, 0.9 * meterToUnit, 0)
        const bermMesh = new Mesh(bermGeo, matRegolithBerm)
        applyShadows(bermMesh)
        moduleGroup.add(bermMesh)

        // Contrafuertes exteriores de la berma
        for (let b = 0; b < 6; b++) {
          const bAngle = (b * Math.PI) / 3
          const buttressGeo = new BoxGeometry(1.2 * meterToUnit, 2.0 * meterToUnit, 2.8 * meterToUnit)
          buttressGeo.rotateY(bAngle)
          buttressGeo.translate(
            Math.cos(bAngle) * 6.2 * meterToUnit,
            1.0 * meterToUnit,
            Math.sin(bAngle) * 6.2 * meterToUnit,
          )
          const buttressMesh = new Mesh(buttressGeo, matRegolithBerm)
          applyShadows(buttressMesh)
          moduleGroup.add(buttressMesh)
        }

        // Cilindro central presurizado con paneles de aleación aeroespacial
        const habCylGeo = new CylinderGeometry(5.0 * meterToUnit, 5.2 * meterToUnit, 4.0 * meterToUnit, 32)
        habCylGeo.translate(0, 2.0 * meterToUnit, 0)
        const habCylMesh = new Mesh(habCylGeo, matWhiteHull)
        applyShadows(habCylMesh)
        moduleGroup.add(habCylMesh)

        // Correas de sujeción radiales de la estructura inflable TransHab
        for (let r = 0; r < 8; r++) {
          const rAngle = (r * Math.PI) / 4
          const strapGeo = new CylinderGeometry(0.06 * meterToUnit, 0.06 * meterToUnit, 4.2 * meterToUnit, 6)
          strapGeo.translate(Math.cos(rAngle) * 5.12 * meterToUnit, 2.0 * meterToUnit, Math.sin(rAngle) * 5.12 * meterToUnit)
          const strapMesh = new Mesh(strapGeo, matMetalFrame)
          moduleGroup.add(strapMesh)
        }

        // Cúpula superior semiesférica (Kevlar/Vectran compuesto)
        const domeGeo = new SphereGeometry(5.0 * meterToUnit, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2)
        domeGeo.translate(0, 4.0 * meterToUnit, 0)
        const domeMesh = new Mesh(domeGeo, matWhiteHull)
        applyShadows(domeMesh)
        moduleGroup.add(domeMesh)

        // Cúpula de observación panorámica octogonal (Mirador de supervisión)
        const cupolaGeo = new CylinderGeometry(1.6 * meterToUnit, 1.8 * meterToUnit, 1.1 * meterToUnit, 8)
        cupolaGeo.translate(0, (4.0 + 4.9) * meterToUnit, 0)
        const cupolaMesh = new Mesh(cupolaGeo, matMetalFrame)
        applyShadows(cupolaMesh)
        moduleGroup.add(cupolaMesh)

        const cupolaGlassGeo = new SphereGeometry(1.5 * meterToUnit, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
        cupolaGlassGeo.translate(0, (4.0 + 5.3) * meterToUnit, 0)
        const cupolaGlassMesh = new Mesh(cupolaGlassGeo, matGlassGreenhouse)
        moduleGroup.add(cupolaGlassMesh)

        // Paneles radiadores de disipación térmica (refrigeración por amoníaco)
        for (let p of [-1, 1]) {
          const radGeo = new BoxGeometry(0.12 * meterToUnit, 3.5 * meterToUnit, 4.2 * meterToUnit)
          radGeo.translate(p * 5.4 * meterToUnit, 3.2 * meterToUnit, 0)
          const radMesh = new Mesh(radGeo, matMetalFrame)
          applyShadows(radMesh)
          moduleGroup.add(radMesh)
        }

        // Esclusa de emergencia y vestíbulo con compuerta presurizada
        const vestibuleGeo = new BoxGeometry(2.4 * meterToUnit, 2.6 * meterToUnit, 3.2 * meterToUnit)
        vestibuleGeo.translate(0, 1.3 * meterToUnit, 5.8 * meterToUnit)
        const vestibuleMesh = new Mesh(vestibuleGeo, matWhiteHull)
        applyShadows(vestibuleMesh)
        moduleGroup.add(vestibuleMesh)

        const hatchDoorGeo = new CylinderGeometry(0.8 * meterToUnit, 0.8 * meterToUnit, 0.2 * meterToUnit, 16)
        hatchDoorGeo.rotateX(Math.PI / 2)
        hatchDoorGeo.translate(0, 1.3 * meterToUnit, 7.42 * meterToUnit)
        const hatchDoor = new Mesh(hatchDoorGeo, matMetalFrame)
        applyShadows(hatchDoor)
        moduleGroup.add(hatchDoor)

        // Mástil de comunicaciones de espacio profundo y baliza meteorológica
        const mastGeo = new CylinderGeometry(0.12 * meterToUnit, 0.16 * meterToUnit, 6.2 * meterToUnit, 8)
        mastGeo.translate(0, (4.0 + 5.3 + 3.1) * meterToUnit, 0)
        const mastMesh = new Mesh(mastGeo, matMetalFrame)
        applyShadows(mastMesh)
        moduleGroup.add(mastMesh)

        // Baliza estroboscópica de peligro aeronáutico en la cúspide del mástil
        const strobeGeo = new SphereGeometry(0.22 * meterToUnit, 8, 8)
        strobeGeo.translate(0, (4.0 + 5.3 + 6.3) * meterToUnit, 0)
        const strobeMesh = new Mesh(strobeGeo, matLightCyan)
        moduleGroup.add(strobeMesh)
        break
      }

      case 'greenhouse': {
        // --- 3. INVERNADERO BIOREGENERATIVO (CELSS BIO-DOME) ---
        // Plataforma de cimentación y servicio
        const baseGeo = new BoxGeometry(7.6 * meterToUnit, 0.5 * meterToUnit, 14.5 * meterToUnit)
        baseGeo.translate(0, 0.25 * meterToUnit, 0)
        const baseMesh = new Mesh(baseGeo, matMetalFrame)
        applyShadows(baseMesh)
        moduleGroup.add(baseMesh)

        // Bóveda cilíndrica translúcida de fluoropolímero ETFE triple capa
        const vaultGeo = new CylinderGeometry(3.8 * meterToUnit, 3.8 * meterToUnit, 13.8 * meterToUnit, 24, 1, true, 0, Math.PI)
        vaultGeo.rotateZ(Math.PI / 2)
        vaultGeo.translate(0, 0.5 * meterToUnit, 0)
        const vaultMesh = new Mesh(vaultGeo, matGlassGreenhouse)
        moduleGroup.add(vaultMesh)

        // Esqueleto exterior de arcos estructurales en celosía
        for (let a = -5.5; a <= 5.5; a += 2.2) {
          const ribGeo = new TorusGeometry(3.85 * meterToUnit, 0.15 * meterToUnit, 8, 24, Math.PI)
          ribGeo.rotateZ(Math.PI)
          ribGeo.rotateY(Math.PI / 2)
          ribGeo.translate(0, 0.5 * meterToUnit, a * meterToUnit)
          const ribMesh = new Mesh(ribGeo, matMetalFrame)
          applyShadows(ribMesh)
          moduleGroup.add(ribMesh)
        }

        // 3 Filas interiores de bastidores verticales de cultivo hidropónico
        for (let r = -2.2; r <= 2.2; r += 2.2) {
          const cropRackGeo = new BoxGeometry(1.1 * meterToUnit, 1.8 * meterToUnit, 12.0 * meterToUnit)
          cropRackGeo.translate(r * meterToUnit, 1.4 * meterToUnit, 0)
          const cropRackMesh = new Mesh(cropRackGeo, matCropsGlow)
          applyShadows(cropRackMesh)
          moduleGroup.add(cropRackMesh)

          // Lámparas LED lineales fotosintéticas suspendidas sobre cada fila
          const ledGeo = new BoxGeometry(0.2 * meterToUnit, 0.1 * meterToUnit, 11.5 * meterToUnit)
          ledGeo.translate(r * meterToUnit, 2.9 * meterToUnit, 0)
          const ledMesh = new Mesh(ledGeo, matLightCyan)
          moduleGroup.add(ledMesh)
        }

        // Skid exterior de reciclaje de agua y condensadores de humedad
        const eclsSkidGeo = new BoxGeometry(2.2 * meterToUnit, 2.0 * meterToUnit, 3.2 * meterToUnit)
        eclsSkidGeo.translate(0, 1.25 * meterToUnit, 7.8 * meterToUnit)
        const eclsSkid = new Mesh(eclsSkidGeo, matWhiteHull)
        applyShadows(eclsSkid)
        moduleGroup.add(eclsSkid)
        break
      }

      case 'laboratory': {
        // --- 4. LABORATORIO CIENTÍFICO DE GEOLOGÍA Y ASTROBIOLOGÍA ---
        // Casco cilíndrico presurizado horizontal con tapas semiesféricas
        const labBodyGeo = new CylinderGeometry(2.9 * meterToUnit, 2.9 * meterToUnit, 11.5 * meterToUnit, 24)
        labBodyGeo.rotateZ(Math.PI / 2)
        labBodyGeo.translate(0, 2.8 * meterToUnit, 0)
        const labBodyMesh = new Mesh(labBodyGeo, matWhiteHull)
        applyShadows(labBodyMesh)
        moduleGroup.add(labBodyMesh)

        // Extremos semiesféricos presurizados
        const capWestGeo = new SphereGeometry(2.9 * meterToUnit, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
        capWestGeo.rotateZ(Math.PI / 2)
        capWestGeo.translate(-5.75 * meterToUnit, 2.8 * meterToUnit, 0)
        const capWest = new Mesh(capWestGeo, matWhiteHull)
        applyShadows(capWest)
        moduleGroup.add(capWest)

        const capEastGeo = new SphereGeometry(2.9 * meterToUnit, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
        capEastGeo.rotateZ(-Math.PI / 2)
        capEastGeo.translate(5.75 * meterToUnit, 2.8 * meterToUnit, 0)
        const capEast = new Mesh(capEastGeo, matWhiteHull)
        applyShadows(capEast)
        moduleGroup.add(capEast)

        // Cuna de soporte y anclaje al suelo marciano
        for (let s of [-3.5, 3.5]) {
          const saddleGeo = new BoxGeometry(1.2 * meterToUnit, 1.8 * meterToUnit, 6.2 * meterToUnit)
          saddleGeo.translate(s * meterToUnit, 0.9 * meterToUnit, 0)
          const saddle = new Mesh(saddleGeo, matMetalFrame)
          applyShadows(saddle)
          moduleGroup.add(saddle)
        }

        // Brazo robótico articulado exterior para recepción de testigos de roca
        const armBaseGeo = new CylinderGeometry(0.3 * meterToUnit, 0.35 * meterToUnit, 0.8 * meterToUnit, 8)
        armBaseGeo.translate(2.5 * meterToUnit, 5.7 * meterToUnit, 1.2 * meterToUnit)
        moduleGroup.add(new Mesh(armBaseGeo, matMetalFrame))

        const armBoomGeo = new CylinderGeometry(0.12 * meterToUnit, 0.12 * meterToUnit, 3.5 * meterToUnit, 6)
        armBoomGeo.rotateZ(Math.PI / 3)
        armBoomGeo.translate(3.8 * meterToUnit, 7.0 * meterToUnit, 1.2 * meterToUnit)
        const armBoom = new Mesh(armBoomGeo, matMetalFrame)
        applyShadows(armBoom)
        moduleGroup.add(armBoom)

        // Antena parabólica orientable de espacio profundo (Deep Space Network)
        const dishGeo = new SphereGeometry(2.2 * meterToUnit, 16, 12, 0, Math.PI * 2, 0, Math.PI / 3)
        dishGeo.rotateX(-Math.PI / 3.2)
        dishGeo.translate(-2.5 * meterToUnit, 6.8 * meterToUnit, 0)
        const dishMesh = new Mesh(dishGeo, matMetalFrame)
        applyShadows(dishMesh)
        moduleGroup.add(dishMesh)

        const dishPedestal = new CylinderGeometry(0.2 * meterToUnit, 0.25 * meterToUnit, 1.8 * meterToUnit, 8)
        dishPedestal.translate(-2.5 * meterToUnit, 5.7 * meterToUnit, 0)
        moduleGroup.add(new Mesh(dishPedestal, matMetalFrame))

        // Cono alimentador central de la antena parabólica
        const feedHornGeo = new CylinderGeometry(0.08 * meterToUnit, 0.18 * meterToUnit, 1.2 * meterToUnit, 8)
        feedHornGeo.rotateX(-Math.PI / 3.2)
        feedHornGeo.translate(-2.5 * meterToUnit, 7.6 * meterToUnit, 0.8 * meterToUnit)
        moduleGroup.add(new Mesh(feedHornGeo, matMetalFrame))
        break
      }

      case 'storage': {
        // --- 5. MÓDULO LOGÍSTICO Y ESCLUSA SUITPORT EVA ---
        const boxGeo = new BoxGeometry(6.8 * meterToUnit, 4.0 * meterToUnit, 8.5 * meterToUnit)
        boxGeo.translate(0, 2.0 * meterToUnit, 0)
        const boxMesh = new Mesh(boxGeo, matWhiteHull)
        applyShadows(boxMesh)
        moduleGroup.add(boxMesh)

        // Dos compuertas suitport en la pared frontal (acoplamiento exterior de trajes)
        for (let s = -1.6; s <= 1.6; s += 3.2) {
          const suitPortGeo = new BoxGeometry(1.3 * meterToUnit, 2.2 * meterToUnit, 0.45 * meterToUnit)
          suitPortGeo.translate(s * meterToUnit, 1.9 * meterToUnit, 4.35 * meterToUnit)
          const suitPortMesh = new Mesh(suitPortGeo, matMetalFrame)
          applyShadows(suitPortMesh)
          moduleGroup.add(suitPortMesh)

          // Aro de sellado hermético
          const sealRingGeo = new RingGeometry(0.45 * meterToUnit, 0.65 * meterToUnit, 16)
          sealRingGeo.translate(s * meterToUnit, 2.2 * meterToUnit, 4.58 * meterToUnit)
          moduleGroup.add(new Mesh(sealRingGeo, matLightCyan))
        }

        // Parque exterior de tanques criogénicos cilíndricos de O2, N2 y H2O
        for (let t = -1.5; t <= 1.5; t += 1.5) {
          const tankGeo = new CylinderGeometry(0.65 * meterToUnit, 0.65 * meterToUnit, 5.8 * meterToUnit, 16)
          tankGeo.rotateX(Math.PI / 2)
          tankGeo.translate(t * meterToUnit, 4.6 * meterToUnit, 0)
          const tankMesh = new Mesh(tankGeo, t === 0 ? matGoldMli : matWhiteHull)
          applyShadows(tankMesh)
          moduleGroup.add(tankMesh)
        }

        // Racks de herramientas geológicas exteriores (taladros, palas y cajas de muestras)
        const toolRackGeo = new BoxGeometry(0.5 * meterToUnit, 1.8 * meterToUnit, 4.0 * meterToUnit)
        toolRackGeo.translate(3.6 * meterToUnit, 1.2 * meterToUnit, 0)
        const toolRack = new Mesh(toolRackGeo, matMetalFrame)
        applyShadows(toolRack)
        moduleGroup.add(toolRack)
        break
      }

      case 'energy': {
        // --- 6. PLANTA SOLAR FOTOVOLTAICA ARTICULADA Y SUBESTACIÓN ---
        // Contenedor blindado de la subestación de baterías y conmutadores
        const subStationGeo = new BoxGeometry(4.2 * meterToUnit, 2.5 * meterToUnit, 4.2 * meterToUnit)
        subStationGeo.translate(0, 1.25 * meterToUnit, 0)
        const subStationMesh = new Mesh(subStationGeo, matMetalFrame)
        applyShadows(subStationMesh)
        moduleGroup.add(subStationMesh)

        // Radiadores de refrigeración en el techo de la subestación
        for (let f = -1.2; f <= 1.2; f += 0.6) {
          const finGeo = new BoxGeometry(0.08 * meterToUnit, 0.6 * meterToUnit, 3.2 * meterToUnit)
          finGeo.translate(f * meterToUnit, 2.8 * meterToUnit, 0)
          moduleGroup.add(new Mesh(finGeo, matMetalFrame))
        }

        // 6 Grandes alas solares fotovoltaicas con seguimiento del Sol
        for (let row = -1; row <= 1; row++) {
          for (let col = -1; col <= 1; col++) {
            if (row === 0 && col === 0) continue // Espacio de la subestación
            const pGroup = new Group()
            pGroup.position.set(col * 11.0 * meterToUnit, 0, row * 7.5 * meterToUnit)

            // Pylon central de soporte con motor de acimut
            const postGeo = new CylinderGeometry(0.22 * meterToUnit, 0.28 * meterToUnit, 2.4 * meterToUnit, 8)
            postGeo.translate(0, 1.2 * meterToUnit, 0)
            const post = new Mesh(postGeo, matMetalFrame)
            applyShadows(post)
            pGroup.add(post)

            // Mecanismo gimbal basculante de elevación
            const gimbalGeo = new BoxGeometry(0.6 * meterToUnit, 0.4 * meterToUnit, 0.6 * meterToUnit)
            gimbalGeo.translate(0, 2.4 * meterToUnit, 0)
            pGroup.add(new Mesh(gimbalGeo, matMetalFrame))

            // Ala solar fotovoltaica con celdas de silicio/GaAs
            const panelGeo = new BoxGeometry(8.2 * meterToUnit, 0.14 * meterToUnit, 4.5 * meterToUnit)
            panelGeo.rotateX(Math.PI / 5.5) // Inclinación óptima respecto al cenit marciano
            panelGeo.translate(0, 2.5 * meterToUnit, 0)
            const panel = new Mesh(panelGeo, matSolarCell)
            applyShadows(panel)
            pGroup.add(panel)

            moduleGroup.add(pGroup)
          }
        }
        break
      }

      case 'isru': {
        // --- 7. PLANTA PILOTO DE RECURSOS IN-SITU (ISRU ALFA) ---
        // Plataforma estructural con conductos empotrados
        const isruBaseGeo = new BoxGeometry(8.5 * meterToUnit, 1.2 * meterToUnit, 10.5 * meterToUnit)
        isruBaseGeo.translate(0, 0.6 * meterToUnit, 0)
        const isruBaseMesh = new Mesh(isruBaseGeo, matMetalFrame)
        applyShadows(isruBaseMesh)
        moduleGroup.add(isruBaseMesh)

        // Reactor SOXE de electrólisis de CO2 a alta temperatura (800°C) con camisa dorada
        const reactorGeo = new BoxGeometry(4.5 * meterToUnit, 4.8 * meterToUnit, 4.5 * meterToUnit)
        reactorGeo.translate(-1.4 * meterToUnit, 3.4 * meterToUnit, 0)
        const reactorMesh = new Mesh(reactorGeo, matGoldMli)
        applyShadows(reactorMesh)
        moduleGroup.add(reactorMesh)

        // Doble ciclón de entrada atmosférica y filtros antipolvo de regolito
        for (let c = -1.2; c <= 1.2; c += 2.4) {
          const cycloneGeo = new CylinderGeometry(0.6 * meterToUnit, 0.3 * meterToUnit, 2.5 * meterToUnit, 12)
          cycloneGeo.translate(-1.4 * meterToUnit, 6.5 * meterToUnit, c * meterToUnit)
          const cycloneMesh = new Mesh(cycloneGeo, matMetalFrame)
          applyShadows(cycloneMesh)
          moduleGroup.add(cycloneMesh)
        }

        // Esfera criogénica aislada al vacío para almacenamiento de oxígeno líquido (LOX)
        const loxTankGeo = new SphereGeometry(2.4 * meterToUnit, 24, 24)
        loxTankGeo.translate(2.5 * meterToUnit, 3.2 * meterToUnit, 1.5 * meterToUnit)
        const loxTank = new Mesh(loxTankGeo, matWhiteHull)
        applyShadows(loxTank)
        moduleGroup.add(loxTank)

        // Trípode de soporte para la esfera criogénica
        const tripGeo = new CylinderGeometry(0.12 * meterToUnit, 0.15 * meterToUnit, 2.4 * meterToUnit, 6)
        tripGeo.translate(2.5 * meterToUnit, 1.4 * meterToUnit, 1.5 * meterToUnit)
        moduleGroup.add(new Mesh(tripGeo, matMetalFrame))

        // Red de tuberías de alta presión para transferencia de gas y propelente
        const pipeGeo = new CylinderGeometry(0.14 * meterToUnit, 0.14 * meterToUnit, 4.8 * meterToUnit, 8)
        pipeGeo.translate(0.5 * meterToUnit, 3.2 * meterToUnit, -1.8 * meterToUnit)
        pipeGeo.rotateZ(Math.PI / 2)
        const pipeMesh = new Mesh(pipeGeo, matMetalFrame)
        applyShadows(pipeMesh)
        moduleGroup.add(pipeMesh)
        break
      }

      case 'rover': {
        // --- 8. ROVER DE EXPLORACIÓN PRESURIZADA (ARES-6X6) ---
        // Chasis y cabina presurizada aerodinámica con aleación aeroespacial
        const cabinGeo = new BoxGeometry(2.8 * meterToUnit, 2.2 * meterToUnit, 5.2 * meterToUnit)
        cabinGeo.translate(0, 1.8 * meterToUnit, 0)
        const cabinMesh = new Mesh(cabinGeo, matWhiteHull)
        applyShadows(cabinMesh)
        moduleGroup.add(cabinMesh)

        // Parabrisas panorámico tintado con vidrio de cuarzo técnico
        const glassGeo = new BoxGeometry(2.6 * meterToUnit, 1.1 * meterToUnit, 1.4 * meterToUnit)
        glassGeo.rotateX(-Math.PI / 7)
        glassGeo.translate(0, 2.2 * meterToUnit, 2.2 * meterToUnit)
        const glassMesh = new Mesh(glassGeo, matGlassGreenhouse)
        moduleGroup.add(glassMesh)

        // Faros dobles de alta intensidad en el parachoques delantero
        for (let hl of [-0.9, 0.9]) {
          const hlGeo = new CylinderGeometry(0.22 * meterToUnit, 0.22 * meterToUnit, 0.15 * meterToUnit, 12)
          hlGeo.rotateX(Math.PI / 2)
          hlGeo.translate(hl * meterToUnit, 1.4 * meterToUnit, 2.7 * meterToUnit)
          moduleGroup.add(new Mesh(hlGeo, matLightCyan))
        }

        // Mástil de navegación sensorial (Cámaras estéreo y LIDAR 360°)
        const roverMastGeo = new CylinderGeometry(0.08 * meterToUnit, 0.08 * meterToUnit, 1.4 * meterToUnit, 8)
        roverMastGeo.translate(0, 3.4 * meterToUnit, 1.2 * meterToUnit)
        moduleGroup.add(new Mesh(roverMastGeo, matMetalFrame))

        const lidarPuckGeo = new CylinderGeometry(0.28 * meterToUnit, 0.28 * meterToUnit, 0.3 * meterToUnit, 12)
        lidarPuckGeo.translate(0, 4.15 * meterToUnit, 1.2 * meterToUnit)
        moduleGroup.add(new Mesh(lidarPuckGeo, matMetalFrame))

        // Suitports traseros para acoplamiento de trajes en la popa del rover
        const roverSuitportGeo = new BoxGeometry(1.6 * meterToUnit, 1.6 * meterToUnit, 0.3 * meterToUnit)
        roverSuitportGeo.translate(0, 1.8 * meterToUnit, -2.75 * meterToUnit)
        moduleGroup.add(new Mesh(roverSuitportGeo, matMetalFrame))

        // 6 Ruedas independientes de aleación elástica con suspensión Rocker-Bogie
        for (let side of [-1.65, 1.65]) {
          for (let zPos of [-1.8, 0, 1.8]) {
            // Brazo de suspensión oscilante
            const bogieArmGeo = new CylinderGeometry(0.08 * meterToUnit, 0.08 * meterToUnit, 0.9 * meterToUnit, 6)
            bogieArmGeo.rotateZ(side > 0 ? Math.PI / 4 : -Math.PI / 4)
            bogieArmGeo.translate(side * 0.8 * meterToUnit, 1.1 * meterToUnit, zPos * meterToUnit)
            moduleGroup.add(new Mesh(bogieArmGeo, matMetalFrame))

            // Rueda elástica con banda de rodadura chevron y núcleo de titanio
            const wheelGeo = new CylinderGeometry(0.72 * meterToUnit, 0.72 * meterToUnit, 0.55 * meterToUnit, 16)
            wheelGeo.rotateZ(Math.PI / 2)
            wheelGeo.translate(side * meterToUnit, 0.72 * meterToUnit, zPos * meterToUnit)
            const wheelMesh = new Mesh(wheelGeo, matRoverTire)
            applyShadows(wheelMesh)
            moduleGroup.add(wheelMesh)

            // Cubo central del motor eléctrico de rueda
            const hubGeo = new CylinderGeometry(0.25 * meterToUnit, 0.25 * meterToUnit, 0.65 * meterToUnit, 12)
            hubGeo.rotateZ(Math.PI / 2)
            hubGeo.translate(side * meterToUnit, 0.72 * meterToUnit, zPos * meterToUnit)
            moduleGroup.add(new Mesh(hubGeo, matMetalFrame))
          }
        }
        break
      }
    }

    colonyRoot.add(moduleGroup)
  })

  // --- TÚNELES PRESURIZADOS DE INTERCONEXIÓN MODULAR ---
  const meterToUnit = 0.12 * scale
  const habX = centerTerrainPos.x
  const habZ = centerTerrainPos.z
  const habY = getTerrainHeight(habX, habZ) + 0.85 * meterToUnit

  const corridorConnections = [
    { targetX: habX + 26 * meterToUnit, targetZ: habZ - (-12) * meterToUnit, label: 'Túnel Habitación-Invernadero' },
    { targetX: habX + (-24) * meterToUnit, targetZ: habZ - (-10) * meterToUnit, label: 'Túnel Habitación-Laboratorio' },
    { targetX: habX + (-2) * meterToUnit, targetZ: habZ - (-22) * meterToUnit, label: 'Túnel Habitación-Esclusa EVA' },
  ]

  corridorConnections.forEach((conn) => {
    const targetY = getTerrainHeight(conn.targetX, conn.targetZ) + 0.85 * meterToUnit
    const startPt = new Vector3(habX, habY + 1.5 * meterToUnit, habZ)
    const endPt = new Vector3(conn.targetX, targetY + 1.5 * meterToUnit, conn.targetZ)
    const midPt = startPt.clone().add(endPt).multiplyScalar(0.5)
    const dist = startPt.distanceTo(endPt)
    const dir = endPt.clone().sub(startPt).normalize()

    // Tubo principal del túnel presurizado orientado exactamente entre módulos en 3D
    const tunnelGeo = new CylinderGeometry(1.2 * meterToUnit, 1.2 * meterToUnit, dist, 16)
    const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir)
    tunnelGeo.applyQuaternion(orientation)
    tunnelGeo.translate(midPt.x, midPt.y, midPt.z)
    const tunnelMesh = new Mesh(tunnelGeo, matWhiteHull)
    applyShadows(tunnelMesh)
    colonyRoot.add(tunnelMesh)

    // Pilar telescópico intermedio de soporte al suelo
    const midGroundY = getTerrainHeight(midPt.x, midPt.z)
    const pylonHeight = Math.max(0.4 * meterToUnit, midPt.y - midGroundY)
    const pylonGeo = new CylinderGeometry(0.14 * meterToUnit, 0.18 * meterToUnit, pylonHeight, 8)
    pylonGeo.translate(midPt.x, midGroundY + pylonHeight / 2, midPt.z)
    const pylonMesh = new Mesh(pylonGeo, matMetalFrame)
    applyShadows(pylonMesh)
    colonyRoot.add(pylonMesh)

    // Aros de fuelle de expansión térmica
    const ringsCount = Math.floor(dist / (2.5 * meterToUnit))
    for (let r = 1; r < ringsCount; r++) {
      const frac = r / ringsCount
      const ringPt = startPt.clone().lerp(endPt, frac)
      const ringTorus = new TorusGeometry(1.28 * meterToUnit, 0.08 * meterToUnit, 6, 16)
      ringTorus.applyQuaternion(orientation)
      ringTorus.translate(ringPt.x, ringPt.y, ringPt.z)
      const ringMesh = new Mesh(ringTorus, matMetalFrame)
      applyShadows(ringMesh)
      colonyRoot.add(ringMesh)
    }
  })

  // --- FIGURAS DE ASTRONAUTAS A ESCALA HUMANA (1.8 M) CON TRAJE mEMU Y VISOR DORADO ---
  for (let a = 0; a < 2; a++) {
    const astroGroup = new Group()
    astroGroup.name = `colony-astronaut-${a + 1}`
    const posX = habX + (a === 0 ? 5.5 : -7.5) * meterToUnit
    const posZ = habZ + (a === 0 ? -16.0 : -18.5) * meterToUnit
    const posY = getTerrainHeight(posX, posZ) + 0.35 * meterToUnit
    astroGroup.position.set(posX, posY, posZ)
    astroGroup.rotation.y = a === 0 ? Math.PI / 3 : -Math.PI / 4

    // Torso del traje presurizado mEMU con articulaciones de fuelle
    const torsoGeo = new CylinderGeometry(0.36 * meterToUnit, 0.32 * meterToUnit, 0.95 * meterToUnit, 12)
    torsoGeo.translate(0, 1.05 * meterToUnit, 0)
    const torsoMesh = new Mesh(torsoGeo, matWhiteHull)
    applyShadows(torsoMesh)
    astroGroup.add(torsoMesh)

    // Módulo DCM de control y visualización en el pecho
    const dcmGeo = new BoxGeometry(0.28 * meterToUnit, 0.22 * meterToUnit, 0.12 * meterToUnit)
    dcmGeo.translate(0, 1.15 * meterToUnit, 0.35 * meterToUnit)
    astroGroup.add(new Mesh(dcmGeo, matMetalFrame))

    // Piernas con rodamientos rotacionales en cadera y rodillas
    for (let leg = -0.16; leg <= 0.16; leg += 0.32) {
      const legGeo = new CylinderGeometry(0.13 * meterToUnit, 0.11 * meterToUnit, 0.72 * meterToUnit, 8)
      legGeo.translate(leg * meterToUnit, 0.36 * meterToUnit, 0)
      const legMesh = new Mesh(legGeo, matWhiteHull)
      applyShadows(legMesh)
      astroGroup.add(legMesh)

      // Botas térmicas pesadas de regolito
      const bootGeo = new BoxGeometry(0.22 * meterToUnit, 0.14 * meterToUnit, 0.35 * meterToUnit)
      bootGeo.translate(leg * meterToUnit, 0.07 * meterToUnit, 0.06 * meterToUnit)
      const bootMesh = new Mesh(bootGeo, matMetalFrame)
      applyShadows(bootMesh)
      astroGroup.add(bootMesh)
    }

    // Casco esférico con visor reflectante dorado
    const helmetGeo = new SphereGeometry(0.28 * meterToUnit, 16, 16)
    helmetGeo.translate(0, 1.65 * meterToUnit, 0)
    const helmetMesh = new Mesh(helmetGeo, matWhiteHull)
    applyShadows(helmetMesh)
    astroGroup.add(helmetMesh)

    const visorGeo = new SphereGeometry(0.25 * meterToUnit, 12, 12, 0, Math.PI, 0, Math.PI / 1.8)
    visorGeo.rotateX(Math.PI / 2)
    visorGeo.translate(0, 1.66 * meterToUnit, 0.12 * meterToUnit)
    astroGroup.add(new Mesh(visorGeo, matVisorGold))

    // Linternas de exploración a los lados del casco
    for (let l of [-0.25, 0.25]) {
      const lightGeo = new CylinderGeometry(0.04 * meterToUnit, 0.04 * meterToUnit, 0.08 * meterToUnit, 6)
      lightGeo.rotateX(Math.PI / 2)
      lightGeo.translate(l * meterToUnit, 1.7 * meterToUnit, 0.18 * meterToUnit)
      astroGroup.add(new Mesh(lightGeo, matLightCyan))
    }

    // Mochila de soporte vital PLSS (Portable Life Support System) con manta Kapton
    const plssGeo = new BoxGeometry(0.38 * meterToUnit, 0.72 * meterToUnit, 0.26 * meterToUnit)
    plssGeo.translate(0, 1.18 * meterToUnit, -0.26 * meterToUnit)
    const plssMesh = new Mesh(plssGeo, matGoldMli)
    applyShadows(plssMesh)
    astroGroup.add(plssMesh)

    // Antena de radio de emergencia en la mochila
    const antGeo = new CylinderGeometry(0.02 * meterToUnit, 0.02 * meterToUnit, 0.6 * meterToUnit, 4)
    antGeo.translate(0.14 * meterToUnit, 1.78 * meterToUnit, -0.32 * meterToUnit)
    astroGroup.add(new Mesh(antGeo, matMetalFrame))

    colonyRoot.add(astroGroup)
  }

  return colonyRoot
}
