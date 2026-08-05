<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# designs

## Purpose
Design assets directory for the OpenCLI Studio project. Contains UI mockups, design specifications, branding assets, icons, and visual reference materials used across the Studio frontend, extension, documentation, and marketing.

## For AI Agents

### Working In This Directory
- **Asset Types**: May include Figma exports, SVG icons, PNG images, design tokens, color palettes, typography specs.
- **Usage**: Design files are reference-only for implementation -- actual production assets live in their respective project directories (e.g., `studio/src/assets/`, `extension/icons/`).
- **Source of Truth**: Design mockups and specs here should match the implemented UI in the Studio frontend.

### Testing Requirements
- Not applicable -- design assets are visual reference materials.
- Visual verification: compare implemented UI against design mockups.

### Common Patterns
- Keep design files organized by feature or component.
- Prefer vector formats (SVG, Figma) over raster for UI elements.
- Include both light and dark mode variants where applicable.
- Design specs should include dimensions, spacing, color codes, and typography values.
- When implementing from designs, cross-reference with the actual component code in `studio/src/components/`.

## Dependencies

### Internal
- `studio/` -- Studio frontend consumes these designs
- `extension/` -- Extension UI references these designs
- `docs/` -- Documentation site references these designs

<!-- MANUAL: -->
