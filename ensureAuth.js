/* Copyright 2025 Supovia LLC */
const createEnsureAuth = require('@monorepool/agentfirst/ensureAuth.js')
const loginWithBrowser = require('@monorepool/agentfirst/loginWithBrowser.js')
const {
  setAccessTokenForSupoviaClient,
  setAccessTokenCallbackForSupoviaClient,
} = require('@supovia/client/accessToken.js')
const { setApiKeyForSupoviaClient } = require('@supovia/client/apiKey.js')
const {
  setRefreshTokenForSupoviaClient,
  isRefreshTokenExpired,
} = require('@supovia/client/refreshToken.js')
const getAppUrl = require('./getAppUrl.js')
const rehydrateSession = require('./rehydrateSession.js')
const session = require('./sessionStore.js')

const ENV_KEY_NAME = 'SUPOVIA_API_KEY'

// Resolves this invocation's credential with the fleet precedence — stored
// browser session > stored API key secret > SUPOVIA_API_KEY environment
// variable — and feeds the bundled @supovia/client accordingly.
//
// @supovia/client/http.js lets an api key BEAT a token, so the key is handed
// to the client ONLY when no session exists; otherwise a globally exported
// SUPOVIA_API_KEY would silently hijack an interactive session (the
// wapiworld precedence rationale documented in agentfirst/resolveCredential).
//
// Headless with no credential at all, resolveAuth throws immediately with
// instructions naming both `supovia login` and the environment variable —
// never a browser opened into the void.
const resolveAuth = createEnsureAuth({
  session,
  envKeyName: ENV_KEY_NAME,
  binaryName: 'supovia',
  appUrl: getAppUrl(),
})

// Drops a browser session whose refresh token can no longer mint access
// tokens. Only the token pair is removed — a stored API key secret survives
// and becomes the next credential in line.
async function dropExpiredSession() {
  if (session.getAccessToken() || session.getRefreshToken()) {
    await rehydrateSession()

    if (isRefreshTokenExpired()) {
      setAccessTokenCallbackForSupoviaClient(null)
      setAccessTokenForSupoviaClient(null)
      setRefreshTokenForSupoviaClient(null)
      session.remove('accessToken')
      session.remove('refreshToken')
    }
  }
}

module.exports = async function ensureAuth() {
  await dropExpiredSession()

  let resolved = await resolveAuth()

  if (resolved.mode === 'token') {
    await rehydrateSession()
  } else if (resolved.mode === 'key') {
    setApiKeyForSupoviaClient(resolved.credential)
  } else {
    // Interactive terminal with nothing stored: keep the pre-existing TTY
    // auto-login (headless invocations never reach here — resolveAuth threw).
    await loginWithBrowser({ appUrl: getAppUrl(), session })
    await rehydrateSession()
    resolved = { mode: 'token', credential: session.getAccessToken() }
  }

  return resolved
}
