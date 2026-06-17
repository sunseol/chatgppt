# DF-062 PRD: Design System Editor

## Goal

Users can manually tune generated design tokens and negative rules before approving the design system.

## Scope

- Edit color tokens.
- Edit typography min/max values for title, body, caption, and number styles.
- Edit negative rules as newline-separated rules.
- Save edited draft and invalidate downstream layout/slides.
- Preview updates from the edited in-memory design draft.

## Acceptance Criteria

- Design editor UI exposes major tokens and negative rules.
- Saving edited design marks downstream HTML Layout Prototype and slide outputs invalidated.
- Preview uses the currently edited design draft.
- Approval CTA remains `디자인 시스템을 승인하고 레이아웃 초안 생성 시작`.

## Non-Goals

- Full theme marketplace.
- Multi-preview gallery.
- Font file management.
