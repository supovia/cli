#!/usr/bin/env node
/* Copyright 2025 Supovia LLC */
import { existsSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import createProgram from './program.js'

export default createProgram

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  // Default to production, like every other product CLI. From source,
  // @supovia/client resolves its API through @monorepool/env, which follows the
  // calling shell to a local development port, so a global `supovia` linked to
  // this file answered every command with an opaque `fetch failed`. Both
  // variables are read per request, after these static imports. Set
  // SUPOVIA_API_URL explicitly to develop the CLI against a local API.
  process.env.SUPOVIA_API_URL ||= 'https://api.supovia.com'
  process.env.SUPOVIA_APP_URL ||= 'https://app.supovia.com'
  createProgram().parse(process.argv)
}
