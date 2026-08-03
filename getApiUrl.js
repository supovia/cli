/* Copyright 2025 Supovia LLC */

// The API origin `signup` posts to. Mirrors the `service: 'api'` branch of the
// build-time cliGetUrl.js so `node index.js` (dev) and the published bundle
// agree: SUPOVIA_API_URL overrides, production otherwise.
//
// `signup` talks to the API directly instead of going through
// @supovia/client: the client attaches whatever credential it already holds,
// and signup is the one call that must carry no credential but the email and
// password being registered.
module.exports = function getApiUrl() {
  return process.env.SUPOVIA_API_URL || 'https://api.supovia.com'
}
