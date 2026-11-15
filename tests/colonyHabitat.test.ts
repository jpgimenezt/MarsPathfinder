import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLONY_MODULES,
  type HabitatModuleType,
} from '../src/features/colony/colonyCatalog'
import { buildColony3DGroup } from '../src/features/colony/colony3DBuilder'

describe('Mars Colony & Habitat Visualization Module', () => {
  it('contiene los módulos principales de infraestructura humana conceptual', () => {
    expect(DEFAULT_COLONY_MODULES.length).toBeGreaterThanOrEqual(8)

    const expectedTypes: HabitatModuleType[] = [
      'landing',
      'habitat',
      'greenhouse',
      'laboratory',
      'storage',
      'energy',
      'isru',
      'rover',
    ]

    expectedTypes.forEach((type) => {
      const found = DEFAULT_COLONY_MODULES.find(m => m.type === type)
      expect(found, `Módulo de tipo ${type} debe estar presente en el catálogo`).toBeDefined()
      expect(found?.status).toContain('CONCEPTUAL')
      expect(found?.subsystems.length).toBeGreaterThan(0)
      expect(found?.dimensions.widthMeters).toBeGreaterThan(0)
      expect(found?.dimensions.heightMeters).toBeGreaterThan(0)
    })
  })

  it('respeta el principio de transparencia científica identificando toda infraestructura como conceptual', () => {
    DEFAULT_COLONY_MODULES.forEach((mod) => {
      expect(mod.status).toBe('PROPUESTA CONCEPTUAL')
      expect(mod.technicalReference).toBeDefined()
      expect(mod.technicalReference.length).toBeGreaterThan(5)
    })
  })

  it('construye la jerarquía 3D de la colonia con identificadores de raycasting correctos', () => {
    const colonyGroup = buildColony3DGroup({
      getTerrainHeight: () => 10,
      centerTerrainPos: { x: -50, z: -100 },
      scale: 1.0,
    })

    expect(colonyGroup.name).toBe('ares-mars-colony-root')
    expect(colonyGroup.children.length).toBeGreaterThan(10) // 8 módulos + túneles + 2 astronautas

    // Verificar que los módulos tienen userData y nombres para selección interactiva
    const landingMesh = colonyGroup.children.find(c => c.name.includes('mod-landing-pad'))
    expect(landingMesh).toBeDefined()
    expect(landingMesh?.userData?.moduleData?.type).toBe('landing')

    const habMesh = colonyGroup.children.find(c => c.name.includes('mod-habitat-core'))
    expect(habMesh).toBeDefined()
    expect(habMesh?.userData?.moduleData?.category).toBe('HÁBITAT')

    const greenhouseMesh = colonyGroup.children.find(c => c.name.includes('mod-greenhouse-celss'))
    expect(greenhouseMesh).toBeDefined()
    expect(greenhouseMesh?.userData?.moduleData?.category).toBe('SOPORTE_VITAL')

    // Verificar figuras de astronautas a escala humana
    const astronaut1 = colonyGroup.children.find(c => c.name === 'colony-astronaut-1')
    expect(astronaut1).toBeDefined()
  })
})
