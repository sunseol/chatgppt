# DF-112 Text And Font Reconstruction Context

- Ticket: DF-112. 텍스트/폰트 재구성 구현
- Priority: P0
- Depends on: DF-066A, DF-111A

Build a deterministic reconstruction layer over DOM MVP editable layers so text layers carry role-aware font candidates and measurable editability quality.

## Scope

- Reconstruct title, body, source/caption/metric text layers from MVP editable layer models.
- Choose Korean-safe font stacks from the existing minimal font policy.
- Score title editability >= 95% and body editability >= 85%.
- Detect corrupted Korean text in reconstructed layers.
