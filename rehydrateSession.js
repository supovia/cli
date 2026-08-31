/* Copyright 2025 Supovia LLC */
import {
  setAccessTokenCallbackForSupoviaClient,
  setAccessTokenForSupoviaClient,
} from '@supovia/client/accessToken.js'
import { setRefreshTokenForSupoviaClient } from '@supovia/client/refreshToken.js'

import session from './sessionStore.js'

// Pushes the stored browser session into @supovia/client and registers the
// persistence callback, so an access token the client refreshes mid-command
// lands back in ~/.supovia/ for the next invocation.
export default async function rehydrateSession() {
  setAccessTokenForSupoviaClient(session.getAccessToken())
  setRefreshTokenForSupoviaClient(session.getRefreshToken())
  setAccessTokenCallbackForSupoviaClient(accessToken => {
    if (accessToken) {
      session.setAccessToken(accessToken)
    }
  })
}
