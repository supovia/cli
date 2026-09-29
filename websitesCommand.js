/* Copyright 2025 Supovia LLC */
import { inspect } from 'node:util'

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import addWebsite from '@supovia/client/addWebsite.js'
import getWebsite from '@supovia/client/getWebsite.js'
import getWebsites from '@supovia/client/getWebsites.js'
import updateWebsite from '@supovia/client/updateWebsite.js'
import commander from 'commander'

import ensureAuth from './ensureAuth.js'

function websitesCommand() {
  const command = new commander.Command('websites')
  command.description('manage websites')

  // supovia websites list
  withJson(command.command('list').description('list websites')).action(
    async options => {
      const { json } = options
      try {
        await ensureAuth()

        const websites = await getWebsites()

        if (json) {
          printJson(websites)
        } else if (websites.length === 0) {
          console.log('No websites found')
        } else {
          console.log(`Found ${websites.length} website(s):`)
          websites.forEach((site, index) => {
            const name = site.name || site.domain || site._id
            const domain = site.domain ? ` (${site.domain})` : ''
            console.log(`${index + 1}. ${name}${domain} (${site._id})`)
          })
        }
      } catch (error) {
        fail(error, { json })
      }
    },
  )

  // supovia websites get [websiteIdOrVanityId]
  withJson(
    command
      .command('get [websiteIdOrVanityId]')
      .description(
        'get websites (raw JSON), or a single website by id or vanity id',
      ),
  ).action(async (websiteIdOrVanityId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      if (websiteIdOrVanityId) {
        const website = await getWebsite(websiteIdOrVanityId)

        if (website) {
          if (json) {
            printJson(website)
          } else {
            console.log(inspect(website, { colors: true, depth: null }))
          }
        } else if (json) {
          fail(new Error('Website not found'), { json })
        } else {
          console.log('Website not found')
        }
      } else {
        const websites = await getWebsites()
        if (json) {
          printJson(websites)
        } else {
          console.log(inspect(websites, { colors: true, depth: null }))
        }
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia websites read <websiteIdOrVanityId>
  withJson(
    command
      .command('read <websiteIdOrVanityId>')
      .description('read a website formatted for the terminal'),
  ).action(async (websiteIdOrVanityId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const website = await getWebsite(websiteIdOrVanityId)

      if (!website) {
        if (json) {
          fail(new Error('Website not found'), { json })
        } else {
          console.log('Website not found')
        }

        return
      }

      if (json) {
        printJson(website)

        return
      }

      const dim = text => `\x1b[2m${text}\x1b[0m`
      const bold = text => `\x1b[1m${text}\x1b[0m`
      const cyan = text => `\x1b[36m${text}\x1b[0m`

      console.log()
      const name = website.name || website.domain || website._id
      console.log(bold(name))
      const meta = [website._id]
      if (website.domain) {
        meta.push(website.domain)
      }
      console.log(dim(meta.join('  ·  ')))
      console.log()

      const fields = []
      if (website.organizationId) {
        fields.push(`${cyan('organizationId')}  ${website.organizationId}`)
      }
      if (website.vanityId) {
        fields.push(`${cyan('vanityId')}  ${website.vanityId}`)
      }
      if (website.domain) {
        fields.push(`${cyan('domain')}  ${website.domain}`)
      }
      const { customerAgentEnabled, customerAgentPrompt } = website
      if (customerAgentEnabled != null) {
        fields.push(`${cyan('customerAgentEnabled')}  ${customerAgentEnabled}`)
      }
      if (customerAgentPrompt) {
        fields.push(`${cyan('customerAgentPrompt')}  ${customerAgentPrompt}`)
      }
      if (website.creationTime) {
        fields.push(`${cyan('created')}  ${website.creationTime}`)
      }
      if (website.lastEditTime) {
        fields.push(`${cyan('edited')}   ${website.lastEditTime}`)
      }

      if (fields.length > 0) {
        fields.forEach(line => console.log(line))
      }

      console.log()
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia websites add --name <name> --organizationId <orgId>
  withJson(
    command
      .command('add')
      .description('add a new website')
      .requiredOption('--name <name>', 'website name')
      .requiredOption('--organizationId <organizationId>', 'organization ID'),
  ).action(async options => {
    const { json } = options
    try {
      await ensureAuth()

      const website = await addWebsite({
        name: options.name,
        organizationId: options.organizationId,
      })

      if (json) {
        printJson({ ok: true, id: website._id, name: website.name })
      } else {
        console.log('Website created successfully:')
        console.log(inspect(website, { colors: true, depth: null }))
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia websites update <websiteIdOrVanityId...> --domain <domain> ...
  withJson(
    command
      .command('update <websiteIdsOrVanityIds...>')
      .description('update one or more websites')
      .option('--domain <domain>', 'set the apex domain (e.g. example.com)')
      .option(
        '--whitelabelDocsUrl <url>',
        'set the whitelabel docs URL (e.g. https://www.example.com/docs)',
      )
      .option('--iframeUrl <url>', 'set the iframe URL')
      .option('--defaultLocale <locale>', 'set the default locale (e.g. en)')
      .option('--vanity-id <vanityId>', 'set the public vanity id')
      .option('--logo <url>', 'set the website logo URL')
      .option('--color-primary <hex>', 'set the primary brand color')
      .option('--color-secondary <hex>', 'set the secondary brand color')
      .option(
        '--customerAgentEnabled [value]',
        'enable/disable the customer support agent (true/false)',
      )
      .option(
        '--customerAgentPrompt <prompt>',
        'set the customer support agent prompt',
      ),
  ).action(async (websiteIdsOrVanityIds, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const updates = {}

      if (options.domain !== undefined) {
        updates.domain = options.domain
      }
      if (options.whitelabelDocsUrl !== undefined) {
        updates.whitelabelDocsUrl = options.whitelabelDocsUrl
      }
      if (options.iframeUrl !== undefined) {
        updates.iframeUrl = options.iframeUrl
      }
      if (options.defaultLocale !== undefined) {
        updates.defaultLocale = options.defaultLocale
      }
      if (options.vanityId !== undefined) {
        updates.vanityId = options.vanityId
      }
      if (options.logo !== undefined) {
        updates.logo = options.logo
      }
      if (options.colorPrimary !== undefined) {
        updates.colorPrimary = options.colorPrimary
      }
      if (options.colorSecondary !== undefined) {
        updates.colorSecondary = options.colorSecondary
      }
      if (options.customerAgentEnabled !== undefined) {
        updates.customerAgentEnabled = options.customerAgentEnabled !== 'false'
      }
      if (options.customerAgentPrompt !== undefined) {
        updates.customerAgentPrompt = options.customerAgentPrompt
      }

      if (Object.keys(updates).length === 0) {
        const message =
          'No updates specified. Use --domain, --whitelabelDocsUrl, --iframeUrl, --defaultLocale, --vanity-id, --logo, --color-primary, --color-secondary, --customerAgentEnabled, or --customerAgentPrompt.'

        if (json) {
          fail(new Error(message), { json })
        } else {
          console.log(message)
        }

        return
      }

      const updated = []
      const notFound = []

      await websiteIdsOrVanityIds.reduce(
        async (previous, websiteIdOrVanityId) => {
          await previous
          const website = await getWebsite(websiteIdOrVanityId)

          if (!website) {
            notFound.push(websiteIdOrVanityId)

            if (!json) {
              console.log(`Website ${websiteIdOrVanityId} not found`)
            }

            return
          }

          // Dashboards keep a cached copy of each Website and replace it only
          // with one whose lastEditTime is newer, so an edit that kept the old
          // time would never reach an operator who already has it loaded.
          await updateWebsite({
            ...website,
            ...updates,
            lastEditTime: new Date().toISOString(),
          })
          updated.push(website._id)

          if (!json) {
            const name = website.name || website.domain || website._id
            const changes = Object.entries(updates)
              .map(([key, value]) => `${key}=${value}`)
              .join(', ')
            console.log(`Updated ${name} (${website._id}): ${changes}`)
          }
        },
        Promise.resolve(),
      )

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

export default websitesCommand
