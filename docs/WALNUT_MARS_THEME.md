# Walnut Mars — UI color refresh

AresRoute theme proposal for the NASA Space Apps public interface.

## Palette

| Token | Hex | Purpose |
|---|---|---|
| Espresso | `#15100e` | Deep background |
| Smoked walnut | `#241a16` | Navigation, panels and elevated surfaces |
| Medium walnut | `#35271f` | Secondary controls |
| Aged copper | `#c99a70` | Interactive accent, borders, focus, telemetry glow |
| Light copper | `#f2d0ac` | Hover / emphasis |
| Parchment | `#f7ede0` | Main text |

## Rules

- CSS-only visual redesign; no changes to geodesy, NASA raster data, mission models, routing, or API behavior.
- Red/error, green/low-risk, and yellow/caution signals remain distinguishable by meaning (rather than being converted to brown).
- Includes the map shell, globe controls, 3D HUD, AI chat and voice gateway controls.
- Existing cyan-named custom properties remain as backward-compatible aliases but point to copper.
- Test legibility and contrast in desktop and mobile; approve the PR before production release.
