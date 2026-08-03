/* Copyright 2025 Supovia LLC */

const {
  setAccessTokenForSupoviaClient,
  setAccessTokenCallbackForSupoviaClient,
} = require('@supovia/client/accessToken.js')
const {
  setRefreshTokenForSupoviaClient,
} = require('@supovia/client/refreshToken.js')
const localStorage = require('./localStorage.js')

module.exports = function clearSession() {
  localStorage.clear()

  setAccessTokenCallbackForSupoviaClient(null)

  setAccessTokenForSupoviaClient(null)
  setRefreshTokenForSupoviaClient(null)
}
