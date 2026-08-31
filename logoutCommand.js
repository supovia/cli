/* Copyright 2025 Supovia LLC */
import agentfirstLogoutCommand from '@monorepool/agentfirst/logoutCommand.js'

import session from './sessionStore.js'

// Clears the whole ~/.supovia/ store: browser tokens and any stored API key
// secret. A SUPOVIA_API_KEY exported in the shell stays in effect — the
// factory says so instead of silently staying authenticated.
export default function logoutCommand() {
  return agentfirstLogoutCommand({
    binaryName: 'supovia',
    session,
    envKeyName: 'SUPOVIA_API_KEY',
  })
}
