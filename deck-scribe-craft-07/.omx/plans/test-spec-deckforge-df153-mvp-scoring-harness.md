# Test Spec: DF-153 MVP Scoring Harness

## Unit

- Given a complete benchmark project and passing QA signals, total score is 100 and release is ready.
- Given missing image/report/editor signals, benchmark score drops and failure reasons are returned.
- Given fatal workflow errors, release is blocked even when total score is at least 80.
- Given multiple benchmarks, the suite result includes pass rate, average score, and benchmark-level failures.
