# visual_qa v1

## Purpose
Check generated slides against visual quality requirements.

## Inputs
- generated slide image
- approved design system
- approved layout prototype
- slide spec

## Output Format
- pass or fail
- readability issues
- overflow issues
- safe margin issues
- style consistency issues

## Rules
- Fail unreadable text.
- Fail clipped or overlapping content.
- Fail style drift from the approved design system.
- Keep remediation notes actionable.

## Failure Mode
Return fail status with issue ids and affected regions.
