import { describe, expect, it } from 'vitest'
import { initialRoutePlan, routeLegs, routePlanReducer } from '../src/features/route/routePlan'
import { JEZERO_CONTEXT } from '../src/features/map/planningRegion'

describe('plan manual sin suposiciones geológicas', () => {
  it('exige A→P→B y no acepta coordenadas no finitas o fuera del ROI', () => {
    expect(routePlanReducer(initialRoutePlan, { type: 'set', id: 'B', point: [77.40, 18.38], region: JEZERO_CONTEXT })).toBe(initialRoutePlan)
    expect(routePlanReducer(initialRoutePlan, { type: 'set', id: 'A', point: [NaN, 18.38], region: JEZERO_CONTEXT })).toBe(initialRoutePlan)
    expect(routePlanReducer(initialRoutePlan, { type: 'set', id: 'A', point: [0, 0], region: JEZERO_CONTEXT })).toBe(initialRoutePlan)
  })
  it('totaliza solo tramos conocidos, con historial para mover, deshacer y restablecer', () => {
    const a = routePlanReducer(initialRoutePlan, { type: 'set', id: 'A', point: [77.40, 18.38], region: JEZERO_CONTEXT })
    expect(routeLegs(a.stops).total).toBeNull()
    const p = routePlanReducer(a, { type: 'set', id: 'P', point: [77.42, 18.39], region: JEZERO_CONTEXT })
    expect(routeLegs(p.stops).first).toBeGreaterThan(0)
    const b = routePlanReducer(p, { type: 'set', id: 'B', point: [77.44, 18.40], region: JEZERO_CONTEXT })
    const legs = routeLegs(b.stops)
    expect(legs.total).toBeCloseTo(legs.first! + legs.second!, 5)
    const moved = routePlanReducer(b, { type: 'set', id: 'P', point: [77.43, 18.41], region: JEZERO_CONTEXT })
    expect(routePlanReducer(moved, { type: 'undo' }).stops).toEqual(b.stops)
    const cleared = routePlanReducer(moved, { type: 'reset' })
    expect(routePlanReducer(cleared, { type: 'undo' }).stops).toEqual(moved.stops)
  })
  it('acepta las cuatro esquinas interiores y revierte un arrastre fuera del sector', () => {
    const a = routePlanReducer(initialRoutePlan, { type: 'set', id: 'A', point: [77.28, 18.02], region: JEZERO_CONTEXT })
    const p = routePlanReducer(a, { type: 'set', id: 'P', point: [78.10, 18.02], region: JEZERO_CONTEXT })
    const b = routePlanReducer(p, { type: 'set', id: 'B', point: [78.10, 18.80], region: JEZERO_CONTEXT })
    const before = routeLegs(b.stops)
    expect(before.first).toBeGreaterThan(0)
    expect(before.second).toBeGreaterThan(0)
    const moved = routePlanReducer(b, { type: 'set', id: 'A', point: [77.28, 18.80], region: JEZERO_CONTEXT })
    expect(routeLegs(moved.stops).total).not.toBeCloseTo(before.total!, 3)
    expect(routePlanReducer(moved, { type: 'set', id: 'A', point: [78.12, 18.80], region: JEZERO_CONTEXT })).toBe(moved)
    expect(routePlanReducer(moved, { type: 'undo' }).stops).toEqual(b.stops)
  })
})
