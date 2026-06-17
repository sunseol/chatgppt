# DF-113 Test Spec

## Unit Tests
- Given prepared chart and table records plus matching editable layers, when reconstructed, then output layers preserve dataset id, unit, period/base years, and source metadata.
- Given generated-image fake graph candidates, when reconstructed, then those ids are reported as rejected and no output layer uses generated-image pixels.
- Given an editable chart/table layer missing the prepared dataset id, when reconstructed, then a fatal issue is returned and the layer is not emitted.

## Verification Commands
- `bun test src/lib/chart-table-layer-reconstruction.test.ts`
- `bun run lint`
- `bun run verify`
