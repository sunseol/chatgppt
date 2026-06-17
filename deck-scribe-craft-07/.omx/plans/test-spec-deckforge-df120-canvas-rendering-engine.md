# Test Spec: DF-120 Canvas Rendering Engine

## Automated Tests

- Canvas model test:
  - builds render nodes for text, shape, image, and chart layers
  - preserves canvas bounds, z-order, and locked state
  - estimates a 10-slide deck under the 5 second open target
- Canvas component test:
  - renders data attributes for each layer and locked state

## Manual Verification

- Open the editor route and confirm layers render as selectable canvas objects.
