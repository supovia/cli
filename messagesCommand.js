/* Copyright 2025 Supovia LLC */
import fs from 'node:fs'
import { inspect } from 'node:util'

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import addMessage from '@supovia/client/addMessage.js'
import getConversation from '@supovia/client/getConversation.js'
import getMessage from '@supovia/client/getMessage.js'
import getMessages from '@supovia/client/getMessages.js'
import commander from 'commander'
import inquirer from 'inquirer'

import ensureAuth from './ensureAuth.js'
import getConfig from './getConfig.js'

async function resolveWebsiteId({ conversationId, websiteId }) {
  if (websiteId || !conversationId) {
    return websiteId
  }

  const conversation = await getConversation(conversationId)

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  return conversation.websiteId
}

async function getScopedMessage(messageId, websiteId) {
  const message = await getMessage(messageId)

  if (websiteId && message?.websiteId !== websiteId) {
    return undefined
  }

  return message
}

function messagesCommand() {
  const command = new commander.Command('messages')
  command.description('manage messages')

  // supovia messages list
  withJson(
    command
      .command('list')
      .description('list messages')
      .option('--websiteId [websiteId]', 'website id')
      .option('--conversationId [conversationId]', 'filter by conversation id')
      .option('-k, --key [key]', 'filter by key')
      .option('-n, --limit [limit]', 'limit number of results'),
  ).action(async options => {
    const { json } = options
    try {
      await ensureAuth()

      const config = getConfig()
      const websiteId = await resolveWebsiteId({
        conversationId: options.conversationId,
        websiteId: options.websiteId || config?.websiteId,
      })

      const parameters = {
        sortField: 'lastEditTime',
        sortDirection: 'DESC',
        limit: options.limit || 10,
      }
      if (websiteId) {
        parameters.websiteId = websiteId
      }
      if (options.conversationId) {
        parameters.conversationId = options.conversationId
      }
      if (options.key) {
        parameters.key = options.key
      }

      const messages = await getMessages(parameters)

      if (json) {
        printJson(messages)
      } else if (messages.length === 0) {
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
      fail(error, { json })
    }
  })

  // supovia messages get [messageId]
  withJson(
    command
      .command('get [messageId]')
      .description('get messages (raw JSON), or a single message by id')
      .option('--websiteId [websiteId]', 'website id')
      .option('--conversationId [conversationId]', 'filter by conversation id')
      .option('-k, --key [key]', 'filter by key')
      .option('-n, --limit [limit]', 'limit number of results'),
  ).action(async (messageId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      if (messageId) {
        const config = getConfig()
        const websiteId = options.websiteId || config?.websiteId
        const message = await getScopedMessage(messageId, websiteId)

        if (message) {
          if (json) {
            printJson(message)
          } else {
            console.log(inspect(message, { colors: true, depth: null }))
          }
        } else if (json) {
          fail(new Error('Message not found'), { json })
        } else {
          console.log('Message not found')
        }
      } else {
        const config = getConfig()
        const websiteId = await resolveWebsiteId({
          conversationId: options.conversationId,
          websiteId: options.websiteId || config?.websiteId,
        })
        const parameters = {
          sortField: 'lastEditTime',
          sortDirection: 'DESC',
          limit: options.limit || 10,
        }
        if (websiteId) {
          parameters.websiteId = websiteId
        }
        if (options.conversationId) {
          parameters.conversationId = options.conversationId
        }
        if (options.key) {
          parameters.key = options.key
        }
        const messages = await getMessages(parameters)
        if (json) {
          printJson(messages)
        } else {
          console.log(inspect(messages, { colors: true, depth: null }))
        }
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia messages read <messageId>
  withJson(
    command
      .command('read <messageId>')
      .description('read a message formatted for the terminal'),
  ).action(async (messageId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const config = getConfig()
      const websiteId = config?.websiteId
      const msg = await getScopedMessage(messageId, websiteId)

      if (!msg) {
        if (json) {
          fail(new Error('Message not found'), { json })
        } else {
          console.log('Message not found')
        }

        return
      }

      if (json) {
        printJson(msg)

        return
      }

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
        console.log(
          `${dim(`action: ${msg.action.name}(${JSON.stringify(msg.action.arguments)})`)}`,
        )
        console.log()
      }

      const footer = []
      if (msg.conversationId) {
        footer.push(`${cyan('conversationId')}  ${msg.conversationId}`)
      }
      if (msg.creationTime) {
        footer.push(`${cyan('created')}  ${msg.creationTime}`)
      }
      if (msg.lastEditTime) {
        footer.push(`${cyan('edited')}   ${msg.lastEditTime}`)
      }
      if (msg.type && msg.type !== 'text') {
        footer.push(`${cyan('type')}  ${msg.type}`)
      }

      if (footer.length > 0) {
        console.log(dim('---'))
        footer.forEach(line => console.log(line))
      }

      console.log()
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia messages send
  withJson(
    command
      .command('send')
      .description('send an operator reply into an existing conversation')
      .option('--conversationId [conversationId]', 'conversation id')
      .option('--content [content]', 'message content (inline string)')
      .option(
        '--content-file <path>',
        'path to a file whose contents become the message content',
      ),
  ).action(async options => {
    const { json } = options
    try {
      await ensureAuth()

      // A reply can be multi-line, so `--content` on a shell is hostile for
      // anything beyond a short line; docsCommand.js's `add` reads bodies the
      // same way.
      const contentFromFile = options.contentFile
        ? fs.readFileSync(options.contentFile, 'utf8')
        : undefined

      const answers = await inquirer.prompt([
        {
          name: 'conversationId',
          message: 'Conversation ID:',
          when: !options.conversationId,
        },
        {
          name: 'content',
          message: 'Message content:',
          when: contentFromFile === undefined && !options.content,
        },
      ])

      const conversationId = options.conversationId || answers.conversationId
      const content = contentFromFile ?? (options.content || answers.content)

      // `from: 'operator'` is what marks this as a support-team reply rather
      // than simulating a customer message — supovia/api's messagesHandler.js
      // only lets an AUTHENTICATED caller (which ensureAuth() above requires)
      // set it; an anonymous request is forced to 'customer' regardless of
      // what it sends. Sending twice sends twice — there is no idempotency
      // key — so confirm the conversationId and exact text before running
      // this for real.
      const message = await addMessage({
        conversationId,
        content,
        from: 'operator',
      })

      if (json) {
        printJson({
          ok: true,
          id: message._id,
          conversationId: message.conversationId,
          creationTime: message.creationTime,
        })
      } else {
        console.log('Message sent successfully')
        console.log(`ID: ${message._id}`)
        console.log(`Conversation: ${message.conversationId}`)
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  return command
}

export default messagesCommand
