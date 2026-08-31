/* Copyright 2025 Supovia LLC */
import { inspect } from 'node:util'

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import getConversation from '@supovia/client/getConversation.js'
import getConversations from '@supovia/client/getConversations.js'
import getMessages from '@supovia/client/getMessages.js'
import updateConversation from '@supovia/client/updateConversation.js'
import commander from 'commander'

import ensureAuth from './ensureAuth.js'
import getConfig from './getConfig.js'

function conversationsCommand() {
  const command = new commander.Command('conversations')
  command.description('manage conversations')

  // supovia conversations list
  withJson(
    command
      .command('list')
      .description('list conversations')
      .option('--websiteId [websiteId]', 'website id')
      .option('--customerId [customerId]', 'filter by customer id')
      .option('-k, --key [key]', 'filter by key')
      .option('-n, --limit [limit]', 'limit number of results'),
  ).action(async options => {
    const { json } = options
    try {
      await ensureAuth()

      const config = getConfig()
      const websiteId = options.websiteId || config?.websiteId

      const parameters = {
        sortField: 'lastEditTime',
        sortDirection: 'DESC',
        limit: options.limit || 10,
      }
      if (websiteId) {
        parameters.websiteId = websiteId
      }
      if (options.customerId) {
        parameters.customerId = options.customerId
      }
      if (options.key) {
        parameters.key = options.key
      }

      const conversations = await getConversations(parameters)

      if (json) {
        printJson(conversations)
      } else if (conversations.length === 0) {
        console.log('No conversations found')
      } else {
        console.log(`Found ${conversations.length} conversation(s):`)
        conversations.forEach((conv, index) => {
          const lastMessage = conv.lastMessage
            ? conv.lastMessage.replace(/\n/g, ' ')
            : ''
          const preview = lastMessage
            ? ` - ${lastMessage.substring(0, 60)}${lastMessage.length > 60 ? '...' : ''}`
            : ''
          const name = conv.customerNickname || conv.customerId || conv._id
          console.log(`${index + 1}. ${name}${preview} (${conv._id})`)
        })
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia conversations get [conversationId]
  withJson(
    command
      .command('get [conversationId]')
      .description(
        'get conversations (raw JSON), or a single conversation by id',
      )
      .option('--websiteId [websiteId]', 'website id')
      .option('--customerId [customerId]', 'filter by customer id')
      .option('-k, --key [key]', 'filter by key')
      .option('-n, --limit [limit]', 'limit number of results'),
  ).action(async (conversationId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      if (conversationId) {
        const conversation = await getConversation(conversationId)

        if (conversation) {
          if (json) {
            printJson(conversation)
          } else {
            console.log(inspect(conversation, { colors: true, depth: null }))
          }
        } else if (json) {
          fail(new Error('Conversation not found'), { json })
        } else {
          console.log('Conversation not found')
        }
      } else {
        const config = getConfig()
        const websiteId = options.websiteId || config?.websiteId
        const parameters = {
          sortField: 'lastEditTime',
          sortDirection: 'DESC',
          limit: options.limit || 10,
        }
        if (websiteId) {
          parameters.websiteId = websiteId
        }
        if (options.customerId) {
          parameters.customerId = options.customerId
        }
        if (options.key) {
          parameters.key = options.key
        }
        const conversations = await getConversations(parameters)
        if (json) {
          printJson(conversations)
        } else {
          console.log(inspect(conversations, { colors: true, depth: null }))
        }
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia conversations read <conversationId>
  withJson(
    command
      .command('read <conversationId>')
      .description('read a conversation formatted for the terminal'),
  ).action(async (conversationId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const conversation = await getConversation(conversationId)

      if (!conversation) {
        if (json) {
          fail(new Error('Conversation not found'), { json })
        } else {
          console.log('Conversation not found')
        }

        return
      }

      const messages = await getMessages({
        conversationId,
        sortDirection: 'ASC',
      })

      if (json) {
        printJson({ conversation, messages })

        return
      }

      const dim = text => `\x1b[2m${text}\x1b[0m`
      const bold = text => `\x1b[1m${text}\x1b[0m`
      const cyan = text => `\x1b[36m${text}\x1b[0m`
      const green = text => `\x1b[32m${text}\x1b[0m`
      const yellow = text => `\x1b[33m${text}\x1b[0m`
      const magenta = text => `\x1b[35m${text}\x1b[0m`

      console.log()
      const name =
        conversation.customerNickname ||
        conversation.customerId ||
        conversation._id
      console.log(bold(`Conversation with ${name}`))
      const meta = [conversation._id]
      if (conversation.country) {
        meta.push(conversation.country)
      }
      if (conversation.resolved) {
        meta.push('resolved')
      }
      console.log(dim(meta.join('  ·  ')))
      console.log()

      if (messages.length === 0) {
        console.log(dim('No messages'))
      } else {
        messages.forEach(msg => {
          const time = msg.creationTime
            ? new Date(msg.creationTime).toLocaleString()
            : ''

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

          console.log(`${dim(time)}  ${label}`)
          if (msg.content) {
            console.log(`  ${msg.content}`)
          }
          if (msg.fileUrl) {
            console.log(`  ${cyan(msg.fileUrl)}`)
          }
          if (msg.action) {
            console.log(
              `  ${dim(`action: ${msg.action.name}(${JSON.stringify(msg.action.arguments)})`)}`,
            )
          }
          console.log()
        })
      }

      const footer = []
      if (conversation.creationTime) {
        footer.push(`${cyan('created')}  ${conversation.creationTime}`)
      }
      if (conversation.lastEditTime) {
        footer.push(`${cyan('edited')}   ${conversation.lastEditTime}`)
      }
      if (conversation.websiteId) {
        footer.push(`${cyan('websiteId')}  ${conversation.websiteId}`)
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

  // supovia conversations update <conversationId...> --resolved [true|false]
  withJson(
    command
      .command('update <conversationIds...>')
      .description('update one or more conversations')
      .option('--resolved [value]', 'set resolved status (true/false)'),
  ).action(async (conversationIds, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const updates = {}

      if (options.resolved !== undefined) {
        updates.resolved = options.resolved !== 'false'
      }

      if (Object.keys(updates).length === 0) {
        if (json) {
          fail(
            new Error(
              'No updates specified. Use --resolved to set resolved status.',
            ),
            { json },
          )
        } else {
          console.log(
            'No updates specified. Use --resolved to set resolved status.',
          )
        }

        return
      }

      const updated = []
      const notFound = []

      await conversationIds.reduce(async (previous, conversationId) => {
        await previous
        const conversation = await getConversation(conversationId)

        if (!conversation) {
          notFound.push(conversationId)

          if (!json) {
            console.log(`Conversation ${conversationId} not found`)
          }

          return
        }

        await updateConversation({ ...conversation, ...updates })
        updated.push(conversationId)

        if (!json) {
          const name =
            conversation.customerNickname ||
            conversation.customerId ||
            conversation._id
          console.log(`Updated ${name} (${conversationId})`)
        }
      }, Promise.resolve())

      if (json) {
        printJson({ ok: notFound.length === 0, updated, notFound })

        if (notFound.length > 0) {
          process.exitCode = 1
        }
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia conversations resolve <conversationId...>
  withJson(
    command
      .command('resolve <conversationIds...>')
      .description('mark one or more conversations as resolved'),
  ).action(async (conversationIds, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const updated = []
      const notFound = []

      await conversationIds.reduce(async (previous, conversationId) => {
        await previous
        const conversation = await getConversation(conversationId)

        if (!conversation) {
          notFound.push(conversationId)

          if (!json) {
            console.log(`Conversation ${conversationId} not found`)
          }

          return
        }

        await updateConversation({ ...conversation, resolved: true })
        updated.push(conversationId)

        if (!json) {
          const name =
            conversation.customerNickname ||
            conversation.customerId ||
            conversation._id
          console.log(`Resolved ${name} (${conversationId})`)
        }
      }, Promise.resolve())

      if (json) {
        printJson({ ok: notFound.length === 0, updated, notFound })

        if (notFound.length > 0) {
          process.exitCode = 1
        }
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  return command
}

export default conversationsCommand
