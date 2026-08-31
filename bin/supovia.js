#!/usr/bin/env node
/* Copyright 2025 Supovia LLC */

// pnpm creates bin symlinks during the linking phase, before any build script
// can run, so a bin pointing straight at the gitignored dist/index.js cannot be
// linked in a fresh checkout. Every new git worktree logged
//   [WARN] Failed to create bin ... ENOENT ... supovia/cli/dist/index.js
// and left `supovia` unresolvable until the next install, because pnpm never
// revisits bins after a later build produces dist.
//
// This launcher is committed, so the symlink always resolves. It runs the
// bundle when one exists — published tarballs ship dist/ and nothing else — and
// otherwise falls back to the source entrypoint that a monorepo checkout has.
//
// process.argv[1] is repointed at the resolved target first: every CLI here
// gates `program.parse` behind a direct-run check that compares import.meta.url
// with realpathSync(process.argv[1]), so leaving argv[1] as this launcher would
// import the program and silently never parse it.

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const bundle = new URL('../dist/index.js', import.meta.url)
const usingBundle = existsSync(fileURLToPath(bundle))
const target = usingBundle ? bundle : new URL('../index.js', import.meta.url)

// The source fallback imports the full monorepo @monorepool/env URL resolver
// (cliGetUrl.js's build-time replacement never runs), which resolves an
// unset SUPOVIA_API_URL/SUPOVIA_APP_URL to this developer's local dev ports —
// the same behavior every product's own dev server relies on. That is right
// for `node index.js`, run deliberately while developing the CLI against a
// local API. It is wrong for THIS launcher: `supovia <command>` is the
// documented interface for querying supovia.com, dist/ is gitignored, and a
// fresh git worktree never has it built. Without this, every such worktree
// silently talks to a local API instead — refused, most likely dev-server-not
// -running connections that surface as an opaque `fetch failed` with no hint
// that dist/ was missing. Default (never override an explicit choice) to the
// same production URLs cliGetUrl.js would have compiled in.
if (!usingBundle) {
  process.env.SUPOVIA_API_URL ||= 'https://api.supovia.com'
  process.env.SUPOVIA_APP_URL ||= 'https://app.supovia.com'
}

process.argv[1] = fileURLToPath(target)

await import(target.href)
