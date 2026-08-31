/* Copyright 2025 Supovia LLC */

import path from 'node:path'

import fs from 'fs-extra'

function getFiles_(dir) {
  let subdirs = fs.readdirSync(dir)
  subdirs = subdirs.filter(file => !file.startsWith('node_modules'))
  const files = subdirs.map(subdir => {
    const resource = path.resolve(dir, subdir)
    return fs.statSync(resource).isDirectory() ? getFiles(resource) : resource
  })
  return files.reduce((a, f) => a.concat(f), [])
}

function getFiles(dir) {
  dir = dir || '.'
  let files = getFiles_(dir)

  files = files
    .map(file => file.replace(path.resolve('.'), ''))
    .filter(file => !file.startsWith('/.'))

  return files
}

export default getFiles
