/* Copyright 2025 Supovia LLC */

// Build-time replacement for the monorepo URL resolver. The published CLI
// only ever needs this product's own public URLs, so the full internal
// domain/port registry never enters the npm bundle. Overrides:
// SUPOVIA_API_URL and SUPOVIA_APP_URL.
export default function getUrl({ service } = {}) {
  if (service === 'api') {
    return process.env.SUPOVIA_API_URL || 'https://api.supovia.com'
  }
  if (service === 'app') {
    return process.env.SUPOVIA_APP_URL || 'https://app.supovia.com'
  }
  return 'https://www.supovia.com'
}
