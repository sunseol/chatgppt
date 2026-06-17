# PRD: DF-132 Generation Report

## Goal

Generate a trust-oriented report that lets a user trace each final slide from user request through research, design, layout, editable layers, generation/revision, and export artifacts.

## Requirements

- Every slide lists plan, source map, design system, layout prototype, editable layer, and generated slide lineage.
- Report includes prompt version records.
- Report includes approval history, revision notes, conversion quality, layout validation, fact-check risks, and uncertainty.
- Report includes export artifact id/hash/path when PNG/project export exists.
- Verification failures and uncertain items must be shown, not silently omitted.

## Non-Goals

- Final export gate blocking is DF-133.
- Pixel-level visual diff reporting is outside this ticket.
