import { describe, expect, it } from 'vitest'
import { initialRoutePlan, routeLegs, routePlanReducer } from '../src/features/route/routePlan'

describe('plan manual sin suposiciones geológicas', () => {
  it('exige A→P→B y no acepta coordenadas no finitas o fuera del ROI', () => {
    expect(routePlanReducer(initialRoutePlan, { type: 'set', id: 'B', point: [77.40, 18.38] })).toBe(initialRoutePlan)
    expect(routePlanReducer(initialRoutePlan, { type: 'set', id: 'A', point: [NaN, 18.38] })).toBe(initialRoutePlan)
    expect(routePlanReducer(initialRoutePlan, { type: 'set', id: 'A', point: [0, 0] })).toBe(initialRoutePlan)
  })
  it('totaliza solo tramos conocidos, con historial para mover, deshacer y restablecer', () => {
    const a = routePlanReducer(initialRoutePlan, { type: 'set', id: 'A', point: [77.40, 18.38] })
    expect(routeLegs(a.stops).total).toBeNull()
    const p = routePlanReducer(a, { type: 'set', id: 'P', point: [77.42, 18.39] })
    expect(routeLegs(p.stops).first).toBeGreaterThan(0)
    const b = routePlanReducer(p, { type: 'set', id: 'B', point: [77.44, 18.40] })
    const legs = routeLegs(b.stops)
    expect(legs.total).toBeCloseTo(legs.first! + legs.second!, 5)
    const moved = routePlanReducer(b, { type: 'set', id: 'P', point: [77.43, 18.41] })
    expect(routePlanReducer(moved, { type: 'undo' }).stops).toEqual(b.stops)
    const cleared = routePlanReducer(moved, { type: 'reset' })
    expect(routePlanReducer(cleared, { type: 'undo' }).stops).toEqual(moved.stops)
  })
})
