# DF-062A PRD: Design System Minimal Approval UI

## Goal

Users can review a generated design system and approve it without a full token editor.

## Acceptance Criteria

- The UI shows Design System JSON, summary, and preview.
- The approval button text is exactly `디자인 시스템을 승인하고 레이아웃 초안 생성 시작`.
- Approval produces an approved `design_system_id` for downstream layout generation.

## Implementation Status

- `DesignSystemSummaryPanel`, `DesignSystemJsonPanel`, `DesignSystemPreviewPanel`, and `DesignSystemNegativeRulesPanel` exist.
- `DesignStage` approves design artifacts and advances to layout.
- `DesignStage.integration.test.tsx` covers the required review surfaces and CTA.

## Non-Goals

- Editing individual design tokens.
- Previewing multiple slide layouts.
- Provider-backed design revisions.
