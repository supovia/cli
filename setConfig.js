/* Copyright 2025 Supovia LLC */
const fs = require('fs-extra')
const path = require('node:path')

module.exports = function setConfig(config) {
  const configPath = path.resolve('.', 'supovia.json')

  let string = ''

  if (config) {
    string = JSON.stringify(config)
  }

  config = fs.writeFileSync(configPath, string)

  return config
}
