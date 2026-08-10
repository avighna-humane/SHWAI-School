---
name: DB server functions pattern
description: How to safely import the postgres DB client inside createServerFn handlers to avoid client-bundle violations.
---

## Rule
Inside `createServerFn().handler(async () => { ... })` bodies, always use dynamic import:
```ts
const { db } = await import('@/lib/db');
```
Never place `import { db } from '@/lib/db'` at the top level of an actions file.

**Why:** TanStack Start's `import-protection-plugin` also blocks direct `postgres` package imports from reaching the client bundle. A top-level import in an actions file gets tree-shaken into the client chunk. The dynamic `await import()` inside the handler body is only executed server-side, so the plugin never sees it as a client import.

**How to apply:** Every handler function in `src/actions/*.ts` that touches the DB must do `const { db } = await import('@/lib/db')` as its first line. This pattern was verified working in production.
