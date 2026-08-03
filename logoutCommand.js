/* Copyright 2025 Supovia LLC */
const agentfirstLogoutCommand = require('@monorepool/agentfirst/logoutCommand.js')
const session = require('./sessionStore.js')

// Clears the whole ~/.supovia/ store: browser tokens and any stored API key
// secret. A SUPOVIA_API_KEY exported in the shell stays in effect — the
// factory says so instead of silently staying authenticated.
module.exports = function logoutCommand() {
  return agentfirstLogoutCommand({
    binaryName: 'supovia',
    session,
    envKeyName: 'SUPOVIA_API_KEY',
  })
}
