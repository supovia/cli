/* Copyright 2025 Supovia LLC */
const localStorage = require('./localStorage.js')

module.exports = function setRefreshToken(refreshToken) {
  return localStorage.setItem('refreshToken', refreshToken)
}
