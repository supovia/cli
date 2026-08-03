/* Copyright 2025 Supovia LLC */
const localStorage = require('./localStorage.js')

module.exports = function getAccessToken() {
  return localStorage.getItem('accessToken')
}
