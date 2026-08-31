/* Copyright 2025 Supovia LLC */

import path from 'node:path'

import fs from 'fs-extra'

export default function setConfig(config) {
  const configPath = path.resolve('.', 'supovia.json')

  let string = ''

  if (config) {
    string = JSON.stringify(config)
  }

  config = fs.writeFileSync(configPath, string)

  return config
}
