# AI-103 Milestone 5 — Files Changed

See `docs/rmsm-ai/AI103_MILESTONE5_STRATEGY_BUILDER_UI.md` (in the zip) for the full
architectural writeup. Quick reference:

## Created — packages/ui (design system, 18 components)
packages/ui/src/components/button.tsx
packages/ui/src/components/input.tsx
packages/ui/src/components/textarea.tsx
packages/ui/src/components/label.tsx
packages/ui/src/components/card.tsx
packages/ui/src/components/badge.tsx
packages/ui/src/components/dialog.tsx
packages/ui/src/components/select.tsx
packages/ui/src/components/table.tsx
packages/ui/src/components/skeleton.tsx
packages/ui/src/components/tabs.tsx
packages/ui/src/components/dropdown-menu.tsx
packages/ui/src/components/separator.tsx
packages/ui/src/components/checkbox.tsx
packages/ui/src/components/switch.tsx
packages/ui/src/components/tooltip.tsx
packages/ui/src/components/toaster.tsx
packages/ui/src/components/visually-hidden.tsx

## Created — apps/web (pages)
apps/web/src/app/strategies/layout.tsx
apps/web/src/app/strategies/page.tsx
apps/web/src/app/strategies/list/page.tsx
apps/web/src/app/strategies/search/page.tsx
apps/web/src/app/strategies/new/page.tsx
apps/web/src/app/strategies/[strategyId]/page.tsx
apps/web/src/app/strategies/[strategyId]/versions/new/page.tsx
apps/web/src/app/strategies/[strategyId]/versions/[versionId]/page.tsx

## Created — apps/web (components)
apps/web/src/components/layout/app-shell.tsx
apps/web/src/components/layout/sidebar.tsx
apps/web/src/components/layout/session-bar.tsx
apps/web/src/components/layout/theme-toggle.tsx
apps/web/src/components/providers/theme-provider.tsx
apps/web/src/components/strategy/status-badges.tsx
apps/web/src/components/strategy/strategy-table.tsx
apps/web/src/components/strategy/parameters-editor.tsx
apps/web/src/components/strategy/rule-builder/rule-builder.tsx
apps/web/src/components/strategy/rule-builder/group-editor.tsx
apps/web/src/components/strategy/rule-builder/rule-row.tsx
apps/web/src/components/strategy/rule-builder/condition-editor.tsx
apps/web/src/components/strategy/rule-builder/operand-editor.tsx
apps/web/src/components/strategy/rule-builder/rule-tree-viewer.tsx
apps/web/src/components/ui-extra/empty-state.tsx
apps/web/src/components/ui-extra/confirm-dialog.tsx
apps/web/src/components/ui-extra/table-pagination.tsx
apps/web/src/components/ui-extra/session-gate.tsx

## Created — apps/web (hooks/lib/types)
apps/web/src/hooks/use-request-context.ts
apps/web/src/hooks/use-strategies.ts
apps/web/src/hooks/use-strategy-versions.ts
apps/web/src/hooks/use-unsaved-changes-warning.ts
apps/web/src/lib/api-client.ts
apps/web/src/lib/rule-tree-mapper.ts
apps/web/src/lib/rule-tree-ops.ts
apps/web/src/lib/session-store.ts
apps/web/src/lib/theme-store.ts
apps/web/src/types/strategy.ts

## Created — tests (8 files, 44 tests)
apps/web/src/lib/__tests__/rule-tree-mapper.test.ts
apps/web/src/lib/__tests__/rule-tree-ops.test.ts
apps/web/src/lib/__tests__/api-client.test.ts
apps/web/src/components/strategy/__tests__/status-badges.test.tsx
apps/web/src/components/strategy/__tests__/parameters-editor.test.tsx
apps/web/src/components/strategy/rule-builder/__tests__/rule-builder.test.tsx
apps/web/src/hooks/__tests__/use-request-context.test.ts
apps/web/vitest.setup.ts

## Modified
packages/ui/src/index.ts
packages/ui/package.json
packages/ui/tsconfig.json
apps/web/package.json
apps/web/tailwind.config.ts
apps/web/src/app/globals.css
apps/web/src/app/layout.tsx
apps/web/src/app/page.tsx
apps/web/vitest.config.ts

## Documentation
docs/rmsm-ai/AI103_MILESTONE5_STRATEGY_BUILDER_UI.md
