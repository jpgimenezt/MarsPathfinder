/**
 * ARES — Constructor 3D de Infraestructura y Hábitat Humano en Marte
 * Ensambla modelos tridimensionales detallados con materiales PBR de ingeniería aeroespacial
 * integrados directamente sobre el terreno de Gale Crater (LZ-1 Bradbury Base).
 */

import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import {
  DEFAULT_COLONY_MODULES,
} from './colonyCatalog'

export interface ColonyBuilderOptions {
  getTerrainHeight: (x: number, z: number) => number
  centerTerrainPos: { x: number; z: number }
  scale?: number
}

/**
 * Construye el conjunto tridimensional completo de la colonia marciana Base Alfa.
 */
export function buildColony3DGroup(options: ColonyBuilderOptions): Group {
  const { getTerrainHeight, centerTerrainPos, scale = 1.0 } = options
  const colonyRoot = new Group()
  colonyRoot.name = 'ares-mars-colony-root'

  // Materiales PBR compartidos y optimizados
  const matWhiteHull = new MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.65,
    roughness: 0.32,
  })

  const matGoldMli = new MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.95,
    roughness: 0.22,
  })

  const matSolarCell = new MeshStandardMaterial({
    color: 0x172554,
    metalness: 0.9,
    roughness: 0.15,
  })

  const matGlassGreenhouse = new MeshStandardMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.55,
    roughness: 0.12,
    metalness: 0.1,
    side: DoubleSide,
  })

  const matCropsGlow = new MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  })

  const matMetalFrame = new MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.35,
  })

  const matRegolithBerm = new MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.95,
    metalness: 0.05,
  })

  const matVisorGold = new MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.98,
    roughness: 0.1,
  })

  const matLightCyan = new MeshBasicMaterial({
    color: 0x00f0ff,
  })

  // Generar cada módulo del catálogo
  DEFAULT_COLONY_MODULES.forEach((mod) => {
    // Conversión de desplazamiento de metros a unidades de terreno 3D (1 km ≈ 5.9 unidades -> 1 m ≈ 0.0059 u)
    // Para visualización local interactiva sin perder escala relativa, usamos escala 0.12 u/m
    const meterToUnit = 0.12 * scale
    const worldX = centerTerrainPos.x + mod.offsetMeters.east * meterToUnit
    const worldZ = centerTerrainPos.z - mod.offsetMeters.north * meterToUnit
    const groundY = getTerrainHeight(worldX, worldZ)

    const moduleGroup = new Group()
    moduleGroup.name = `colony-module-${mod.id}`
    moduleGroup.position.set(worldX, groundY, worldZ)
    moduleGroup.rotation.y = (mod.rotationDeg * Math.PI) / 180

    // Etiqueta de identificación para raycasting
    moduleGroup.userData = { moduleData: mod }

    switch (mod.type) {
      case 'landing': {
        // --- MÓDULO DE ATERRIZAJE Y ASCENSO (HLS) ---
        // Plataforma octogonal en el suelo
        const padGeo = new CylinderGeometry(7.5 * meterToUnit, 8.2 * meterToUnit, 0.4 * meterToUnit, 8)
        padGeo.translate(0, 0.2 * meterToUnit, 0)
        const padMesh = new Mesh(padGeo, matMetalFrame)
        moduleGroup.add(padMesh)

        // Luces de aproximación de la plataforma
        const padRingGeo = new RingGeometry(7.0 * meterToUnit, 7.3 * meterToUnit, 16)
        padRingGeo.rotateX(-Math.PI / 2)
        const padRingMesh = new Mesh(padRingGeo, matLightCyan)
        padRingMesh.position.y = 0.42 * meterToUnit
        moduleGroup.add(padRingMesh)

        // Etapa de descenso (octogonal dorada con patas)
        const descentGeo = new CylinderGeometry(4.2 * meterToUnit, 4.6 * meterToUnit, 4.5 * meterToUnit, 8)
        descentGeo.translate(0, (0.4 + 2.25) * meterToUnit, 0)
        const descentMesh = new Mesh(descentGeo, matGoldMli)
        moduleGroup.add(descentMesh)

        // 4 Patas de aterrizaje telescópicas con zapatas de apoyo
        for (let i = 0; i < 4; i++) {
          const legAngle = (i * Math.PI) / 2 + Math.PI / 4
          const legGroup = new Group()
          legGroup.rotation.y = legAngle

          const strutGeo = new CylinderGeometry(0.2 * meterToUnit, 0.2 * meterToUnit, 5.0 * meterToUnit, 6)
          strutGeo.rotateZ(Math.PI / 5)
          strutGeo.translate(2.2 * meterToUnit, 2.0 * meterToUnit, 0)
          const strutMesh = new Mesh(strutGeo, matMetalFrame)
          legGroup.add(strutMesh)

          const footGeo = new CylinderGeometry(0.8 * meterToUnit, 0.9 * meterToUnit, 0.25 * meterToUnit, 8)
          footGeo.translate(4.2 * meterToUnit, 0.12 * meterToUnit, 0)
          const footMesh = new Mesh(footGeo, matMetalFrame)
          legGroup.add(footMesh)

          moduleGroup.add(legGroup)
        }

        // Etapa de ascenso / Cabina de tripulación blanca
        const ascentGeo = new CylinderGeometry(3.6 * meterToUnit, 4.0 * meterToUnit, 8.5 * meterToUnit, 16)
        ascentGeo.translate(0, (4.9 + 4.25) * meterToUnit, 0)
        const ascentMesh = new Mesh(ascentGeo, matWhiteHull)
        moduleGroup.add(ascentMesh)

        // Cúpula superior aerodinámica
        const noseGeo = new SphereGeometry(3.6 * meterToUnit, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
        noseGeo.translate(0, (4.9 + 8.5) * meterToUnit, 0)
        const noseMesh = new Mesh(noseGeo, matWhiteHull)
        moduleGroup.add(noseMesh)

        // Rampa de desembarco hacia la superficie
        const rampGeo = new BoxGeometry(1.6 * meterToUnit, 0.2 * meterToUnit, 6.5 * meterToUnit)
        rampGeo.rotateX(Math.PI / 6)
        rampGeo.translate(0, 1.8 * meterToUnit, 5.0 * meterToUnit)
        const rampMesh = new Mesh(rampGeo, matMetalFrame)
        moduleGroup.add(rampMesh)
        break
      }

      case 'habitat': {
        // --- HÁBITAT PRINCIPAL (HAB CORE ALFA) ---
        // Anillo de regolito protector (berma exterior contra radiación)
        const bermGeo = new TorusGeometry(5.8 * meterToUnit, 1.4 * meterToUnit, 8, 24)
        bermGeo.rotateX(Math.PI / 2)
        bermGeo.translate(0, 0.8 * meterToUnit, 0)
        const bermMesh = new Mesh(bermGeo, matRegolithBerm)
        moduleGroup.add(bermMesh)

        // Cilindro central presurizado
        const habCylGeo = new CylinderGeometry(5.0 * meterToUnit, 5.2 * meterToUnit, 3.8 * meterToUnit, 24)
        habCylGeo.translate(0, 1.9 * meterToUnit, 0)
        const habCylMesh = new Mesh(habCylGeo, matWhiteHull)
        moduleGroup.add(habCylMesh)

        // Cúpula geodésica superior
        const domeGeo = new SphereGeometry(5.0 * meterToUnit, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
        domeGeo.translate(0, 3.8 * meterToUnit, 0)
        const domeMesh = new Mesh(domeGeo, matWhiteHull)
        moduleGroup.add(domeMesh)

        // Mirador / Cúpula de observación panorámica
        const cupolaGeo = new CylinderGeometry(1.4 * meterToUnit, 1.6 * meterToUnit, 0.9 * meterToUnit, 8)
        cupolaGeo.translate(0, (3.8 + 4.8) * meterToUnit, 0)
        const cupolaMesh = new Mesh(cupolaGeo, matMetalFrame)
        moduleGroup.add(cupolaMesh)

        const cupolaGlassGeo = new SphereGeometry(1.3 * meterToUnit, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
        cupolaGlassGeo.translate(0, (3.8 + 5.2) * meterToUnit, 0)
        const cupolaGlassMesh = new Mesh(cupolaGlassGeo, matGlassGreenhouse)
        moduleGroup.add(cupolaGlassMesh)

        // Mástil de comunicaciones y meteorología
        const mastGeo = new CylinderGeometry(0.12 * meterToUnit, 0.12 * meterToUnit, 4.2 * meterToUnit, 6)
        mastGeo.translate(0, (3.8 + 5.2 + 2.1) * meterToUnit, 0)
        const mastMesh = new Mesh(mastGeo, matMetalFrame)
        moduleGroup.add(mastMesh)
        break
      }

      case 'greenhouse': {
        // --- INVERNADERO BIOREGENERATIVO (CELSS BIO-DOME) ---
        // Base rectangular con esclusa
        const baseGeo = new BoxGeometry(7.2 * meterToUnit, 0.5 * meterToUnit, 13.5 * meterToUnit)
        baseGeo.translate(0, 0.25 * meterToUnit, 0)
        const baseMesh = new Mesh(baseGeo, matMetalFrame)
        moduleGroup.add(baseMesh)

        // Bóveda translúcida ETFE
        const vaultGeo = new CylinderGeometry(3.6 * meterToUnit, 3.6 * meterToUnit, 12.8 * meterToUnit, 16, 1, true, 0, Math.PI)
        vaultGeo.rotateZ(Math.PI / 2)
        vaultGeo.translate(0, 0.5 * meterToUnit, 0)
        const vaultMesh = new Mesh(vaultGeo, matGlassGreenhouse)
        moduleGroup.add(vaultMesh)

        // Estructura de arcos de soporte exterior
        for (let a = -5; a <= 5; a += 2.5) {
          const ribGeo = new TorusGeometry(3.65 * meterToUnit, 0.12 * meterToUnit, 6, 16, Math.PI)
          ribGeo.rotateZ(Math.PI)
          ribGeo.rotateY(Math.PI / 2)
          ribGeo.translate(0, 0.5 * meterToUnit, a * meterToUnit)
          const ribMesh = new Mesh(ribGeo, matMetalFrame)
          moduleGroup.add(ribMesh)
        }

        // Filas interiores de cultivo hidropónico con luz fotosintética
        for (let r = -2; r <= 2; r += 2) {
          const cropRackGeo = new BoxGeometry(1.2 * meterToUnit, 1.4 * meterToUnit, 11.5 * meterToUnit)
          cropRackGeo.translate(r * meterToUnit, 1.2 * meterToUnit, 0)
          const cropRackMesh = new Mesh(cropRackGeo, matCropsGlow)
          moduleGroup.add(cropRackMesh)
        }
        break
      }

      case 'laboratory': {
        // --- LABORATORIO DE GEOLOGÍA Y ASTROBIOLOGÍA ---
        // Módulo presurizado horizontal
        const labBodyGeo = new CylinderGeometry(2.8 * meterToUnit, 2.8 * meterToUnit, 11.0 * meterToUnit, 16)
        labBodyGeo.rotateZ(Math.PI / 2)
        labBodyGeo.translate(0, 2.6 * meterToUnit, 0)
        const labBodyMesh = new Mesh(labBodyGeo, matWhiteHull)
        moduleGroup.add(labBodyMesh)

        // Tapas semiesféricas en los extremos
        const capWestGeo = new SphereGeometry(2.8 * meterToUnit, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2)
        capWestGeo.rotateZ(Math.PI / 2)
        capWestGeo.translate(-5.5 * meterToUnit, 2.6 * meterToUnit, 0)
        moduleGroup.add(new Mesh(capWestGeo, matWhiteHull))

        const capEastGeo = new SphereGeometry(2.8 * meterToUnit, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2)
        capEastGeo.rotateZ(-Math.PI / 2)
        capEastGeo.translate(5.5 * meterToUnit, 2.6 * meterToUnit, 0)
        moduleGroup.add(new Mesh(capEastGeo, matWhiteHull))

        // Antena parabólica de espacio profundo en el techo
        const dishGeo = new SphereGeometry(1.8 * meterToUnit, 12, 8, 0, Math.PI * 2, 0, Math.PI / 3)
        dishGeo.rotateX(-Math.PI / 3)
        dishGeo.translate(1.8 * meterToUnit, 6.2 * meterToUnit, 0)
        const dishMesh = new Mesh(dishGeo, matMetalFrame)
        moduleGroup.add(dishMesh)

        const dishPedestal = new CylinderGeometry(0.15 * meterToUnit, 0.2 * meterToUnit, 1.5 * meterToUnit, 6)
        dishPedestal.translate(1.8 * meterToUnit, 4.8 * meterToUnit, 0)
        moduleGroup.add(new Mesh(dishPedestal, matMetalFrame))
        break
      }

      case 'storage': {
        // --- MÓDULO LOGÍSTICO Y ESCLUSA EVA (SUITPORT) ---
        const boxGeo = new BoxGeometry(6.5 * meterToUnit, 3.8 * meterToUnit, 8.2 * meterToUnit)
        boxGeo.translate(0, 1.9 * meterToUnit, 0)
        const boxMesh = new Mesh(boxGeo, matWhiteHull)
        moduleGroup.add(boxMesh)

        // Dos compuertas suitport en la pared frontal
        for (let s = -1.6; s <= 1.6; s += 3.2) {
          const suitPortGeo = new BoxGeometry(1.2 * meterToUnit, 2.1 * meterToUnit, 0.4 * meterToUnit)
          suitPortGeo.translate(s * meterToUnit, 1.8 * meterToUnit, 4.2 * meterToUnit)
          const suitPortMesh = new Mesh(suitPortGeo, matMetalFrame)
          moduleGroup.add(suitPortMesh)
        }

        // Tanques cilíndricos exteriores de O2/H2O en el techo
        for (let t = -1.2; t <= 1.2; t += 2.4) {
          const tankGeo = new CylinderGeometry(0.6 * meterToUnit, 0.6 * meterToUnit, 5.5 * meterToUnit, 12)
          tankGeo.rotateX(Math.PI / 2)
          tankGeo.translate(t * meterToUnit, 4.4 * meterToUnit, 0)
          moduleGroup.add(new Mesh(tankGeo, matGoldMli))
        }
        break
      }

      case 'energy': {
        // --- PLANTA SOLAR FOTOVOLTAICA ARTICULADA ---
        const subStationGeo = new BoxGeometry(3.5 * meterToUnit, 2.2 * meterToUnit, 3.5 * meterToUnit)
        subStationGeo.translate(0, 1.1 * meterToUnit, 0)
        moduleGroup.add(new Mesh(subStationGeo, matMetalFrame))

        // 6 Paneles solares inclinados orientados hacia el ecuador
        for (let row = -1; row <= 1; row++) {
          for (let col = -1; col <= 1; col++) {
            if (row === 0 && col === 0) continue // Espacio de la subestación
            const pGroup = new Group()
            pGroup.position.set(col * 9.5 * meterToUnit, 0, row * 6.5 * meterToUnit)

            const postGeo = new CylinderGeometry(0.18 * meterToUnit, 0.2 * meterToUnit, 2.2 * meterToUnit, 6)
            postGeo.translate(0, 1.1 * meterToUnit, 0)
            pGroup.add(new Mesh(postGeo, matMetalFrame))

            const panelGeo = new BoxGeometry(6.8 * meterToUnit, 0.12 * meterToUnit, 3.8 * meterToUnit)
            panelGeo.rotateX(Math.PI / 6) // Inclinación óptima 30°
            panelGeo.translate(0, 2.3 * meterToUnit, 0)
            pGroup.add(new Mesh(panelGeo, matSolarCell))

            moduleGroup.add(pGroup)
          }
        }
        break
      }

      case 'isru': {
        // --- PLANTA PILOTO DE RECURSOS IN-SITU (ISRU) ---
        const isruBaseGeo = new BoxGeometry(7.5 * meterToUnit, 1.2 * meterToUnit, 9.0 * meterToUnit)
        isruBaseGeo.translate(0, 0.6 * meterToUnit, 0)
        moduleGroup.add(new Mesh(isruBaseGeo, matMetalFrame))

        // Torre de compresión y reactor SOXE dorado
        const reactorGeo = new BoxGeometry(4.2 * meterToUnit, 4.5 * meterToUnit, 4.2 * meterToUnit)
        reactorGeo.translate(-1.2 * meterToUnit, 3.2 * meterToUnit, 0)
        moduleGroup.add(new Mesh(reactorGeo, matGoldMli))

        // Tanque criogénico esférico de O2 líquido
        const loxTankGeo = new SphereGeometry(2.1 * meterToUnit, 16, 16)
        loxTankGeo.translate(2.2 * meterToUnit, 2.8 * meterToUnit, 1.4 * meterToUnit)
        moduleGroup.add(new Mesh(loxTankGeo, matWhiteHull))

        // Tubería de alimentación y escape
        const pipeGeo = new CylinderGeometry(0.12 * meterToUnit, 0.12 * meterToUnit, 4.0 * meterToUnit, 8)
        pipeGeo.translate(2.2 * meterToUnit, 2.0 * meterToUnit, -1.8 * meterToUnit)
        moduleGroup.add(new Mesh(pipeGeo, matMetalFrame))
        break
      }

      case 'rover': {
        // --- ROVER DE EXPLORACIÓN PRESURIZADA (6X6) ---
        const cabinGeo = new BoxGeometry(2.6 * meterToUnit, 2.0 * meterToUnit, 4.8 * meterToUnit)
        cabinGeo.translate(0, 1.6 * meterToUnit, 0)
        moduleGroup.add(new Mesh(cabinGeo, matWhiteHull))

        // Parabrisas panorámico
        const glassGeo = new BoxGeometry(2.4 * meterToUnit, 0.9 * meterToUnit, 1.2 * meterToUnit)
        glassGeo.rotateX(-Math.PI / 8)
        glassGeo.translate(0, 2.0 * meterToUnit, 2.2 * meterToUnit)
        moduleGroup.add(new Mesh(glassGeo, matGlassGreenhouse))

        // 6 Ruedas independientes
        for (let side of [-1.5, 1.5]) {
          for (let zPos of [-1.6, 0, 1.6]) {
            const wheelGeo = new CylinderGeometry(0.65 * meterToUnit, 0.65 * meterToUnit, 0.5 * meterToUnit, 12)
            wheelGeo.rotateZ(Math.PI / 2)
            wheelGeo.translate(side * meterToUnit, 0.65 * meterToUnit, zPos * meterToUnit)
            moduleGroup.add(new Mesh(wheelGeo, matMetalFrame))
          }
        }
        break
      }
    }

    colonyRoot.add(moduleGroup)
  })

  // Túneles presurizados de interconexión entre módulos centrales
  const meterToUnit = 0.12 * scale
  const habX = centerTerrainPos.x
  const habZ = centerTerrainPos.z
  const habY = getTerrainHeight(habX, habZ)

  const corridorConnections = [
    { targetX: habX + 26 * meterToUnit, targetZ: habZ - (-12) * meterToUnit, label: 'Túnel Habitación-Invernadero' },
    { targetX: habX + (-24) * meterToUnit, targetZ: habZ - (-10) * meterToUnit, label: 'Túnel Habitación-Laboratorio' },
    { targetX: habX + (-2) * meterToUnit, targetZ: habZ - (-22) * meterToUnit, label: 'Túnel Habitación-Esclusa EVA' },
  ]

  corridorConnections.forEach((conn) => {
    const dx = conn.targetX - habX
    const dz = conn.targetZ - habZ
    const dist = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dx, dz)

    const tunnelGeo = new CylinderGeometry(1.2 * meterToUnit, 1.2 * meterToUnit, dist, 12)
    tunnelGeo.rotateX(Math.PI / 2)
    tunnelGeo.rotateY(angle)
    tunnelGeo.translate(habX + dx / 2, habY + 1.2 * meterToUnit, habZ + dz / 2)
    const tunnelMesh = new Mesh(tunnelGeo, matWhiteHull)
    colonyRoot.add(tunnelMesh)
  })

  // Figuras de astronautas a escala humana (1.8 metros) para contexto de escala
  for (let a = 0; a < 2; a++) {
    const astroGroup = new Group()
    astroGroup.name = `colony-astronaut-${a + 1}`
    const posX = habX + (a === 0 ? 5.5 : -7.5) * meterToUnit
    const posZ = habZ + (a === 0 ? -16.0 : -18.5) * meterToUnit
    const posY = getTerrainHeight(posX, posZ)
    astroGroup.position.set(posX, posY, posZ)
    astroGroup.rotation.y = a === 0 ? Math.PI / 3 : -Math.PI / 4

    // Torso y traje espacial mEMU
    const torsoGeo = new CylinderGeometry(0.35 * meterToUnit, 0.3 * meterToUnit, 0.9 * meterToUnit, 8)
    torsoGeo.translate(0, 1.05 * meterToUnit, 0)
    astroGroup.add(new Mesh(torsoGeo, matWhiteHull))

    // Piernas
    for (let leg = -0.15; leg <= 0.15; leg += 0.3) {
      const legGeo = new CylinderGeometry(0.12 * meterToUnit, 0.1 * meterToUnit, 0.7 * meterToUnit, 6)
      legGeo.translate(leg * meterToUnit, 0.35 * meterToUnit, 0)
      astroGroup.add(new Mesh(legGeo, matWhiteHull))
    }

    // Casco y visor dorado reflectante
    const helmetGeo = new SphereGeometry(0.26 * meterToUnit, 10, 10)
    helmetGeo.translate(0, 1.62 * meterToUnit, 0)
    astroGroup.add(new Mesh(helmetGeo, matWhiteHull))

    const visorGeo = new SphereGeometry(0.24 * meterToUnit, 8, 8, 0, Math.PI, 0, Math.PI / 2)
    visorGeo.rotateX(Math.PI / 2)
    visorGeo.translate(0, 1.62 * meterToUnit, 0.12 * meterToUnit)
    astroGroup.add(new Mesh(visorGeo, matVisorGold))

    // Mochila de soporte vital PLSS
    const plssGeo = new BoxGeometry(0.35 * meterToUnit, 0.65 * meterToUnit, 0.22 * meterToUnit)
    plssGeo.translate(0, 1.15 * meterToUnit, -0.22 * meterToUnit)
    astroGroup.add(new Mesh(plssGeo, matMetalFrame))

    colonyRoot.add(astroGroup)
  }

  return colonyRoot
}
