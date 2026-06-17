# Test Spec: DF-141 Long-Running Job Progress UI

## Unit

- Given a running provider job, the progress view exposes stage, job id, percent, cancel availability, and partial artifact summaries.
- Given a failed provider job with raw multiline error text, the progress view exposes a sanitized one-line failure summary and retry availability.
- Given a serialized recovery snapshot, parsing can restore the job by `job_id`.

## Integration

- The progress panel renders current stage, job id, progress, cancel action, retry action, intermediate artifacts, and recovery marker.
- The progress panel does not render raw stack trace or secret-like log text.

## Manual QA

- Start mock slide generation, confirm progress and job id appear.
- Refresh during or after generation and confirm the last job state is restored from local storage.
- Trigger cancel/retry paths from the panel.
