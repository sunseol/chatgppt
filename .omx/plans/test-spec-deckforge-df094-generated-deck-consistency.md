# Test Spec: DF-094 Generated Deck Consistency Checker

## Unit Tests
- Given a 10-slide generated deck with one failed signal, when evaluated, then the 10% target passes and the failed slide is a regeneration candidate.
- Given a 10-slide generated deck with layout drift, image QA failures, and a density outlier on two or more slides, when evaluated, then violation rate exceeds 10% and target fails.
- Candidate reasons include layout, image QA, and density variance sources.

## Regression Targets
- DF-063 deck consistency checker tests continue to pass.
- DF-093 generated slide QA tests continue to pass.
