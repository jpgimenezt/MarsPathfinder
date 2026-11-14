import { insideRoi } from '../map/marsProjection'
import { marsDistance, type MarsPoint } from './marsDistance'

export type StopId = 'A' | 'P' | 'B'
export type Stops = Partial<Record<StopId, MarsPoint>>
export const STOP_ORDER: StopId[] = ['A', 'P', 'B']

export interface RoutePlan {
  stops: Stops
  history: Stops[]
}

export type RouteAction =
  | { type: 'set'; id: StopId; point: MarsPoint }
  | { type: 'undo' }
  | { type: 'reset' }

export const initialRoutePlan: RoutePlan = { stops: {}, history: [] }

export function routePlanReducer(plan: RoutePlan, action: RouteAction): RoutePlan {
  if (action.type === 'undo') {
    if (!plan.history.length) return plan
    return { stops: plan.history.at(-1)!, history: plan.history.slice(0, -1) }
  }
  if (action.type === 'reset') {
    if (!STOP_ORDER.some(id => plan.stops[id])) return plan
    return { stops: {}, history: [...plan.history, plan.stops] }
  }
  if (!insideRoi(action.point) || !Number.isFinite(action.point[0]) || !Number.isFinite(action.point[1])) return plan
  if (action.id === 'P' && !plan.stops.A) return plan
  if (action.id === 'B' && (!plan.stops.A || !plan.stops.P)) return plan
  return {
    stops: { ...plan.stops, [action.id]: [...action.point] as MarsPoint },
    history: [...plan.history, plan.stops],
  }
}

export function routeLegs(stops: Stops): { first: number | null; second: number | null; total: number | null } {
  const first = stops.A && stops.P ? marsDistance(stops.A, stops.P) : null
  const second = stops.P && stops.B ? marsDistance(stops.P, stops.B) : null
  return { first, second, total: first === null ? null : first + (second ?? 0) }
}
