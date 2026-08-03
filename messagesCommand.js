/* Copyright 2025 Supovia LLC */
const { inspect } = require('node:util')
const commander = require('commander')
const rehydrateSession = require('./session/rehydrateSession.js')
const isLoggedInSession = require('./session/isLoggedInSession.js')
const login = require('./login.js')
const getConfig = require('./getConfig.js')
const getMessages = require('@supovia/client/getMessages.js').default

async function ensureLoggedIn() {
  await rehydrateSession()

  if (!isLoggedInSession()) {
    console.log('Please login first')
    await login()
    await rehydrateSession()
  }
}

function messagesCommand() {
  const command = new commander.Command('messages')
  command.description('manage messages')

  // supovia messages list
  command
    .command('list')
    .description('list messages')
    .option('--websiteId [websiteId]', 'website id')
    .option('--conversationId [conversationId]', 'filter by conversation id')
    .option('-k, --key [key]', 'filter by key')
    .option('-n, --limit [limit]', 'limit number of results')
    .action(async options => {
      try {
        await ensureLoggedIn()

        const config = getConfig()
        const websiteId = options.websiteId || config?.websiteId

        const parameters = {
          sortField: 'lastEditTime',
          sortDirection: 'DESC',
          limit: options.limit || 10,
        }
        if (websiteId) parameters.websiteId = websiteId
        if (options.conversationId) parameters.conversationId = options.conversationId
        if (options.key) parameters.key = options.key

        const messages = await getMessages(parameters)

        if (messages.length === 0) {
          console.log('No messages found')
        } else {
          console.log(`Found ${messages.length} message(s):`)
          messages.forEach((msg, index) => {
            const content = msg.content ? msg.content.replace(/\n/g, ' ') : ''
            const preview = content
              ? ` - ${content.substring(0, 60)}${content.length > 60 ? '...' : ''}`
              : ''
            console.log(`${index + 1}. [${msg.from}]${preview} (${msg._id})`)
          })
        }
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia messages get [messageId]
  command
    .command('get [messageId]')
    .description('get messages (raw JSON), or a single message by id')
    .option('--websiteId [websiteId]', 'website id')
    .option('--conversationId [conversationId]', 'filter by conversation id')
    .option('-k, --key [key]', 'filter by key')
    .option('-n, --limit [limit]', 'limit number of results')
    .action(async (messageId, options) => {
      try {
        await ensureLoggedIn()

        if (messageId) {
          const config = getConfig()
          const websiteId = options.websiteId || config?.websiteId
          const parameters = { _id: messageId }
          if (websiteId) parameters.websiteId = websiteId
          const messages = await getMessages(parameters)

          if (messages.length > 0) {
            console.log(inspect(messages[0], { colors: true, depth: null }))
          } else {
            console.log('Message not found')
          }
        } else {
          const config = getConfig()
          const websiteId = options.websiteId || config?.websiteId
          const parameters = {
            sortField: 'lastEditTime',
            sortDirection: 'DESC',
            limit: options.limit || 10,
          }
          if (websiteId) parameters.websiteId = websiteId
          if (options.conversationId) parameters.conversationId = options.conversationId
          if (options.key) parameters.key = options.key
          const messages = await getMessages(parameters)
          console.log(inspect(messages, { colors: true, depth: null }))
        }
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia messages read <messageId>
  command
    .command('read <messageId>')
    .description('read a message formatted for the terminal')
    .action(async messageId => {
      try {
        await ensureLoggedIn()

        const config = getConfig()
        const websiteId = config?.websiteId
        const parameters = { _id: messageId }
        if (websiteId) parameters.websiteId = websiteId
        const messages = await getMessages(parameters)

        if (messages.length === 0) {
          console.log('Message not found')

          return
        }

        const msg = messages[0]

        const dim = text => `\x1b[2m${text}\x1b[0m`
        const bold = text => `\x1b[1m${text}\x1b[0m`
        const cyan = text => `\x1b[36m${text}\x1b[0m`
        const green = text => `\x1b[32m${text}\x1b[0m`
        const yellow = text => `\x1b[33m${text}\x1b[0m`
        const magenta = text => `\x1b[35m${text}\x1b[0m`

        let label
        if (msg.from === 'customer') {
          label = green('customer')
        } else if (msg.from === 'operator') {
          label = yellow('operator')
        } else if (msg.from === 'agent') {
          label = magenta('agent')
        } else {
          label = msg.from
        }

        console.log()
        console.log(bold(`Message from ${msg.from}`))
        console.log(dim(`${msg._id}  ·  ${label}`))
        console.log()

        if (msg.content) {
          console.log(msg.content)
          console.log()
        }

        if (msg.fileUrl) {
          console.log(cyan(msg.fileUrl))
          console.log()
        }

        if (msg.action) {
          console.log(`${dim(`action: ${msg.action.name}(${JSON.stringify(msg.action.arguments)})`)}`)
          console.log()
        }

        const footer = []
        if (msg.conversationId) footer.push(`${cyan('conversationId')}  ${msg.conversationId}`)
        if (msg.creationTime) footer.push(`${cyan('created')}  ${msg.creationTime}`)
        if (msg.lastEditTime) footer.push(`${cyan('edited')}   ${msg.lastEditTime}`)
        if (msg.type && msg.type !== 'text') footer.push(`${cyan('type')}  ${msg.type}`)

        if (footer.length > 0) {
          console.log(dim('---'))
          footer.forEach(line => console.log(line))
        }

        console.log()
      } catch (error) {
        console.log('error', error)
      }
    })

  return command
}

module.exports = messagesCommand
