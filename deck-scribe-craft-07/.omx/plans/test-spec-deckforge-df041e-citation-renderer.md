# Test Spec: DF-041E Citation Renderer

## Citation Snapshot Tests

- Given a government source, when rendered, then slide, report, and source-map citation formats include the correct source-type-specific fields.
- Given a company source with a URL, when rendered for report, then the URL is retained.
- Given a grade D media source or uncertain citation, when rendered, then the citation includes a review-required marker.
- Given source ids and a source list, when batch rendered, then citations preserve source-id order and report missing ids.

## Report Integration Test

- Generation Report research source lines use the detailed citation renderer.
