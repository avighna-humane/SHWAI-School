---
name: TanStack Start import protection
description: The import-protection-plugin blocks any file path matching **/server/** from being imported in client bundles, even for createServerFn wrappers.
---

## Rule
Server function files (those using `createServerFn`) must NOT live in any directory named `server/`. The TanStack Start import-protection plugin blocks the pattern `**/server/**` in client environments — this includes `src/server/` even though createServerFn files are legitimately imported by route files.

**Why:** The plugin treats `server/` directories as server-only, but `createServerFn` wrappers need to be imported by client route files (the RPC bridge is handled at the framework level, not the import level).

**How to apply:** Place all server function files in `src/actions/` (or any non-`server`-named directory like `src/fns/`, `src/rpc/`). The `@tanstack/react-start` `createServerFn` import itself is fine anywhere.

Note: `app.config.ts` has `tanstackStart: { server: { entry: "server" } }` which refers to `src/server.ts` (the SSR entry point), NOT a directory — this is a separate concept and does not need renaming.
