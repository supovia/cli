/* Copyright 2025 Supovia LLC */
import agentfirstSignupCommand from '@monorepool/agentfirst/signupCommand.js'

import getApiUrl from './getApiUrl.js'
import getAppUrl from './getAppUrl.js'
import session from './sessionStore.js'

// The step that used to need a person. `login` assumes the account exists;
// an agent pointed at supovia.com for the first time has no account to log
// into, and the browser flow it fell into blocked with nobody there to
// complete it.
//
//   supovia signup --email founder@example.com --json
//
// stores the session in the same ~/.supovia/ the browser flow writes, so
// every other command works immediately afterwards.
export default function signupCommand() {
  return agentfirstSignupCommand({
    binaryName: 'supovia',
    getApiUrl,
    appUrl: getAppUrl(),
    session,
  })
}
