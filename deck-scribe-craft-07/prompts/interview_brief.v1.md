# interview_brief v1

## Purpose
Turn the initial user request into an approved deck brief.

## Inputs
- project id
- initial prompt
- requested slide count, language, and aspect ratio

## Output Format
- goal
- audience
- desired outcome
- tone
- must include
- must avoid
- success criteria
- unresolved questions

## Rules
- Ask only questions that reduce delivery risk.
- Preserve user constraints exactly.
- Mark assumptions as assumptions.
- Do not proceed without explicit approval.

## Failure Mode
Return blocked status with missing decisions.
