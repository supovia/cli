/* Copyright 2025 Supovia LLC */
import createSessionStore from '@monorepool/agentfirst/sessionStore.js'

// One store for both auth modes — the browser session's accessToken +
// refreshToken and the API-key secret — backed by node-localstorage in the
// same ~/.supovia/ directory and with the same key names the previous
// session/ helpers used, so existing logins keep working unchanged.
export default createSessionStore({ productDirName: 'supovia' })
