/* Copyright 2025 Supovia LLC */
const localStorage = require('./localStorage.js')

module.exports = function setAccessToken(accessToken) {
  return localStorage.setItem('accessToken', accessToken)
}
