// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { MolaElevationLegend } from '../src/components/MolaElevationLegend'
import { MOLA_LEGEND_URL, MOLA_LOOKUP_URL, MOLA_PALETTE, molaGradient } from '../src/features/globe/molaPalette'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('referencias oficiales MOLA', () => {
  it('conserva la tabla de 31 intervalos de 1 km del mismo producto USGS', () => {
    expect(MOLA_PALETTE).toHaveLength(31)
    expect(MOLA_PALETTE[0]).toEqual([-9000, 104, 38, 103])
    expect(MOLA_PALETTE[9]).toEqual([0, 243, 254, 38])
    expect(MOLA_PALETTE[30]).toEqual([21000, 181, 251, 254])
    for (let index = 1; index < MOLA_PALETTE.length; index++) {
      expect(MOLA_PALETTE[index][0] - MOLA_PALETTE[index - 1][0]).toBe(1000)
    }
    expect(molaGradient).toContain('rgb(104 38 103) 0.00% 3.23%')
    expect(molaGradient).toContain('rgb(181 251 254) 96.77% 100.00%')
    expect(MOLA_LEGEND_URL).toContain('colorhillshade_mola_lut.gif')
    expect(MOLA_LOOKUP_URL).toContain('molateam_contour_31rgb_steps.csv')
  })
  it('la leyenda se abre con controles nativos y no propone alturas por píxel', () => {
    const element = document.createElement('div')
    const root = createRoot(element)
    act(() => root.render(<MolaElevationLegend />))
    expect(element.querySelector('details summary')?.textContent).toBe('Referencias de elevación')
    expect(element.textContent).toContain('areoide marciano')
    expect(element.textContent).toContain('no permite deducir una cota precisa')
    expect(element.textContent).toContain('El azul no es agua')
    expect(element.querySelectorAll('a')).toHaveLength(2)
    act(() => root.unmount())
  })
})
