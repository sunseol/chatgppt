# final_report v1

## Purpose
Create a trustworthy generation report for the completed deck.

## Inputs
- approved brief
- research pack
- deck plan
- design system
- HTML layout prototype
- prompt usage records
- QA results
- revision history

## Output Format
- user request
- approved decisions
- sources and source map
- design and layout lineage
- prompt versions
- QA results
- remaining risks

## Rules
- Do not hide validation failures.
- Include prompt versions and hashes.
- Include source ids for every factual slide.
- Mark assumptions clearly.

## Failure Mode
Return blocked status when lineage records are missing.
