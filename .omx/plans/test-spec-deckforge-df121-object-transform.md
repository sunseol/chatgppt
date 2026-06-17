# Test Spec: DF-121 Object Selection Move Resize

## Automated Tests

- Object transform model test:
  - moves editable layers and snaps to safe margins
  - resizes editable layers while clamping to canvas bounds
  - rejects locked layers
  - estimates drag response under the interaction target
- Canvas panel test:
  - exposes selected layer and resize handle markup

## Manual Verification

- Open the editor route, drag a selected object, and confirm persisted bounds change.
