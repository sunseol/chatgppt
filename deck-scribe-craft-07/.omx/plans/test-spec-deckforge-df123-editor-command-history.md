# DF-123 Test Spec

## Unit Tests
- Given an initial editor layer graph, when a duplicate command is applied, then undo removes the duplicate and redo restores it.
- Given editable layers, when delete, group, and ungroup commands are applied, then the expected layer ids and group ids are updated immutably.
- Given a locked layer, when delete is requested, then the command is rejected and the present layer graph is unchanged.

## Verification Commands
- `bun test src/lib/editor-command-history.test.ts`
- `bun run lint`
- `bun run verify`
