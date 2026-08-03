/* Copyright 2025 Supovia LLC */
const commander = require('commander')
const schemaCommand = require('@monorepool/agentfirst/schemaCommand.js')
const skillsCommand = require('@monorepool/agentfirst/skillsCommand.js')
const conversationsCommand = require('./conversationsCommand.js')
const customersCommand = require('./customersCommand.js')
const docsCommand = require('./docsCommand.js')
const loginCommand = require('./loginCommand.js')
const logoutCommand = require('./logoutCommand.js')
const messagesCommand = require('./messagesCommand.js')
const signupCommand = require('./signupCommand.js')
const websitesCommand = require('./websitesCommand.js')
const packageJson = require('./package.json')

// Assembles the full commander program WITHOUT parsing, so both index.js
// (which parses it) and introspectors — the shared `schema` command, the
// cliSkillDrift test in @supovia/skills — see the same tree.
module.exports = function createProgram() {
  const program = new commander.Command()

  program
    .name('supovia')
    .description('supovia cli — manage support docs, conversations and websites')
    .version(packageJson.version)
    .addCommand(conversationsCommand())
    .addCommand(customersCommand())
    .addCommand(docsCommand())
    .addCommand(loginCommand())
    .addCommand(logoutCommand())
    .addCommand(messagesCommand())
    .addCommand(signupCommand())
    .addCommand(skillsCommand({ baseDirectory: __dirname }))
    .addCommand(websitesCommand())

  // `schema` describes the program at action time, itself included, so it is
  // wired with the composed program per the factory's doc comment.
  program.addCommand(schemaCommand({ program }))

  return program
}
