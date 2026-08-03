/* Copyright 2025 Supovia LLC */
const localStorage = require('./localStorage.js')

module.exports = function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}
