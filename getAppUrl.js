/* Copyright 2025 Supovia LLC */

// The app origin the browser login opens. Mirrors the build-time
// cliGetUrl.js override so `node index.js` (dev) and the published bundle
// agree: SUPOVIA_APP_URL overrides, production otherwise.
export default function getAppUrl() {
  return process.env.SUPOVIA_APP_URL || 'https://app.supovia.com'
}
