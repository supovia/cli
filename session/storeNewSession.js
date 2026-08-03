/* Copyright 2025 Supovia LLC */
const {
  setAccessTokenForSupoviaClient,
  setAccessTokenCallbackForSupoviaClient,
} = require('@supovia/client/accessToken.js')
const {
  setRefreshTokenForSupoviaClient,
} = require('@supovia/client/refreshToken.js')
const setAccessToken = require('./setAccessToken.js')
const setRefreshToken = require('./setRefreshToken.js')

module.exports = async function storeNewSession({ accessToken, refreshToken }) {
  try {
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)

    setAccessTokenForSupoviaClient(accessToken, setAccessToken)
    setRefreshTokenForSupoviaClient(refreshToken, setRefreshToken)
    setAccessTokenCallbackForSupoviaClient(setAccessToken)

    return true
  } catch (error) {
    console.error('error', error)
    throw error
  }
}
