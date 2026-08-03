/* Copyright 2025 Supovia LLC */
const commander = require('commander')
const login = require('./login.js')

function loginCommand() {
  const command = new commander.Command('login')
  command.action(async () => {
    try {
      console.log('login')

      await login()

      console.log('logged in')
    } catch (error) {
      console.log('error', error)
    }
  })

  return command
}

module.exports = loginCommand
