/* Copyright 2025 Supovia LLC */
const {
  setAccessTokenForSupoviaClient,
  setAccessTokenCallbackForSupoviaClient,
} = require('@supovia/client/accessToken.js')
const {
  setRefreshTokenForSupoviaClient,
} = require('@supovia/client/refreshToken.js')
const getAccessToken = require('./getAccessToken.js')
const getRefreshToken = require('./getRefreshToken.js')
const setAccessToken = require('./setAccessToken.js')

module.exports = async function rehydrateSession() {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()

  setAccessTokenForSupoviaClient(accessToken)
  setRefreshTokenForSupoviaClient(refreshToken)
  setAccessTokenCallbackForSupoviaClient(setAccessToken)
}
