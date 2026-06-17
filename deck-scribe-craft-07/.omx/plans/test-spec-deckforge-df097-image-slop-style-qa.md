# Test Spec: DF-097 Image Slop & Style Elevation QA

## Unit Tests
- Given a clean final SVG and passing QA inputs, image slop QA passes with checklist items marked pass.
- Given broken Korean text, decorative sparkle, fake chart lineage, and web UI markers, image slop QA fails with typed issue codes and regeneration action.
- Given generated deck consistency marks the slide as a candidate, image slop QA includes design-system drift and routes to regeneration.

## Regression Targets
- DF-093 generated slide QA tests continue to pass.
- DF-094 generated deck consistency tests continue to pass.
