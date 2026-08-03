/* Copyright 2025 Supovia LLC */
const {
  setAccessTokenForSupoviaClient,
  setAccessTokenCallbackForSupoviaClient,
} = require('@supovia/client/accessToken.js')
const {
  setRefreshTokenForSupoviaClient,
} = require('@supovia/client/refreshToken.js')
const session = require('./sessionStore.js')

// Pushes the stored browser session into @supovia/client and registers the
// persistence callback, so an access token the client refreshes mid-command
// lands back in ~/.supovia/ for the next invocation.
module.exports = async function rehydrateSession() {
  setAccessTokenForSupoviaClient(session.getAccessToken())
  setRefreshTokenForSupoviaClient(session.getRefreshToken())
  setAccessTokenCallbackForSupoviaClient(accessToken => {
    if (accessToken) {
      session.setAccessToken(accessToken)
    }
  })
}
