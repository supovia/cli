/* Copyright 2025 Supovia LLC */
import agentfirstLoginCommand from '@monorepool/agentfirst/loginCommand.js'
import { setApiKeyForSupoviaClient } from '@supovia/client/apiKey.js'
import getWebsites from '@supovia/client/getWebsites.js'

import getAppUrl from './getAppUrl.js'
import session from './sessionStore.js'

// Dual-mode login via the shared factory:
//
//   supovia login --browser    ephemeral-callback-server flow via app.supovia.com
//   supovia login --with-key   masked prompt for an API key secret
//
// The secret is never accepted as an argument. `verify` makes one cheap
// authenticated GET so a bad key fails at login instead of at the first real
// command; the factory drops the secret again when it throws.
export default function loginCommand() {
  return agentfirstLoginCommand({
    binaryName: 'supovia',
    appUrl: getAppUrl(),
    session,
    envKeyName: 'SUPOVIA_API_KEY',
    verify: async () => {
      setApiKeyForSupoviaClient(session.getApiKeySecret())
      const websites = await getWebsites()

      return `Logged in with an API key. ${websites.length} website(s) accessible.`
    },
  })
}
