/* Copyright 2025 Supovia LLC */

import { fileURLToPath as __fileURLToPath } from 'node:url'

import schemaCommand from '@monorepool/agentfirst/schemaCommand.js'
import skillsCommand from '@monorepool/agentfirst/skillsCommand.js'
import commander from 'commander'

import conversationsCommand from './conversationsCommand.js'
import customersCommand from './customersCommand.js'
import docsCommand from './docsCommand.js'
import loginCommand from './loginCommand.js'
import logoutCommand from './logoutCommand.js'
import messagesCommand from './messagesCommand.js'
import packageJson from './package.json' with { type: 'json' }
import signupCommand from './signupCommand.js'
import websitesCommand from './websitesCommand.js'

// Assembles the full commander program WITHOUT parsing, so both index.js
// (which parses it) and introspectors — the shared `schema` command, the
// cliSkillDrift test in @supovia/skills — see the same tree.
export default function createProgram() {
  const program = new commander.Command()

  program
    .name('supovia')
    .description(
      'supovia cli — manage support docs, conversations and websites',
    )
    .version(packageJson.version)
    .addCommand(conversationsCommand())
    .addCommand(customersCommand())
    .addCommand(docsCommand())
    .addCommand(loginCommand())
    .addCommand(logoutCommand())
    .addCommand(messagesCommand())
    .addCommand(signupCommand())
    .addCommand(
      skillsCommand({
        baseDirectory: __fileURLToPath(new URL('.', import.meta.url)),
      }),
    )
    .addCommand(websitesCommand())

  // `schema` describes the program at action time, itself included, so it is
  // wired with the composed program per the factory's doc comment.
  program.addCommand(schemaCommand({ program }))

  return program
}
