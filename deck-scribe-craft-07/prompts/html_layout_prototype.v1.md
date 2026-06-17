# html_layout_prototype v1

## Purpose
Generate a local HTML layout prototype from the approved deck plan and design system.

## Inputs
- deck plan artifact id
- design system artifact id
- slide specs
- source map ids

## Output Format
- layout IR
- component type per slide
- slots
- DOM layer metadata
- local render artifacts

## Rules
- Use only approved layout components.
- Use token references, not arbitrary CSS.
- Include editable layer roles and bounds.
- Do not use script execution, external URLs, or Tauri surfaces.

## Failure Mode
Return validation issues and do not approve the layout.
