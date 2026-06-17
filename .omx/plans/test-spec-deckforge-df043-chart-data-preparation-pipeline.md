# Test Spec: DF-043 Chart Data Preparation Pipeline

## Chart Metadata Validation Tests

- Given a source-backed bar chart, when prepared, then metadata includes dataset id, unit, base years, source ids, source map ids, placeholder id, and final overlay id.
- Given a table chart, when prepared, then metadata is retained even if rendering is handled downstream.
- Given a missing chart placeholder, when prepared, then a fatal issue is returned.
- Given a chart with no dataset/source lineage, when prepared, then a fatal issue is returned.
- Prepared records include an image-model policy that forbids drawing chart values.
