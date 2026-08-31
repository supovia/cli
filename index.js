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
  createProgram().parse(process.argv)
}
