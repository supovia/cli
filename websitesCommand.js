/* Copyright 2025 Supovia LLC */
const { inspect } = require('node:util')
const commander = require('commander')
const rehydrateSession = require('./session/rehydrateSession.js')
const isLoggedInSession = require('./session/isLoggedInSession.js')
const login = require('./login.js')
const getWebsites = require('@supovia/client/getWebsites.js').default
const getWebsite = require('@supovia/client/getWebsite.js').default
const addWebsite = require('@supovia/client/addWebsite.js').default
const updateWebsite = require('@supovia/client/updateWebsite.js').default

async function ensureLoggedIn() {
  await rehydrateSession()

  if (!isLoggedInSession()) {
    console.log('Please login first')
    await login()
    await rehydrateSession()
  }
}

function websitesCommand() {
  const command = new commander.Command('websites')
  command.description('manage websites')

  // supovia websites list
  command
    .command('list')
    .description('list websites')
    .action(async () => {
      try {
        await ensureLoggedIn()

        const websites = await getWebsites()

        if (websites.length === 0) {
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
        console.log('error', error)
      }
    })

  // supovia websites get [websiteIdOrName]
  command
    .command('get [websiteIdOrName]')
    .description('get websites (raw JSON), or a single website by id or name')
    .action(async websiteIdOrName => {
      try {
        await ensureLoggedIn()

        if (websiteIdOrName) {
          const website = await getWebsite(websiteIdOrName)

          if (website) {
            console.log(inspect(website, { colors: true, depth: null }))
          } else {
            console.log('Website not found')
          }
        } else {
          const websites = await getWebsites()
          console.log(inspect(websites, { colors: true, depth: null }))
        }
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia websites read <websiteIdOrName>
  command
    .command('read <websiteIdOrName>')
    .description('read a website formatted for the terminal')
    .action(async websiteIdOrName => {
      try {
        await ensureLoggedIn()

        const website = await getWebsite(websiteIdOrName)

        if (!website) {
          console.log('Website not found')

          return
        }

        const dim = text => `\x1b[2m${text}\x1b[0m`
        const bold = text => `\x1b[1m${text}\x1b[0m`
        const cyan = text => `\x1b[36m${text}\x1b[0m`

        console.log()
        const name = website.name || website.domain || website._id
        console.log(bold(name))
        const meta = [website._id]
        if (website.domain) meta.push(website.domain)
        console.log(dim(meta.join('  ·  ')))
        console.log()

        const fields = []
        if (website.organizationId) fields.push(`${cyan('organizationId')}  ${website.organizationId}`)
        if (website.domain) fields.push(`${cyan('domain')}  ${website.domain}`)
        const customerAgentEnabled =
          website.customerAgentEnabled ?? website.agentEnabled
        const customerAgentPrompt =
          website.customerAgentPrompt ?? website.agentPrompt
        if (customerAgentEnabled != null) {
          fields.push(
            `${cyan('customerAgentEnabled')}  ${customerAgentEnabled}`,
          )
        }
        if (customerAgentPrompt) {
          fields.push(`${cyan('customerAgentPrompt')}  ${customerAgentPrompt}`)
        }
        if (website.creationTime) fields.push(`${cyan('created')}  ${website.creationTime}`)
        if (website.lastEditTime) fields.push(`${cyan('edited')}   ${website.lastEditTime}`)

        if (fields.length > 0) {
          fields.forEach(line => console.log(line))
        }

        console.log()
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia websites add --name <name> --organizationId <orgId>
  command
    .command('add')
    .description('add a new website')
    .requiredOption('--name <name>', 'website name')
    .requiredOption('--organizationId <organizationId>', 'organization ID')
    .action(async options => {
      try {
        await ensureLoggedIn()

        const website = await addWebsite({
          name: options.name,
          organizationId: options.organizationId,
        })

        console.log('Website created successfully:')
        console.log(inspect(website, { colors: true, depth: null }))
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia websites update <websiteIdOrName...> --domain <domain> ...
  command
    .command('update <websiteIdsOrNames...>')
    .description('update one or more websites')
    .option('--domain <domain>', 'set the apex domain (e.g. example.com)')
    .option(
      '--whitelabelDocsUrl <url>',
      'set the whitelabel docs URL (e.g. https://www.example.com/docs)',
    )
    .option('--iframeUrl <url>', 'set the iframe URL')
    .option('--defaultLocale <locale>', 'set the default locale (e.g. en)')
    .option(
      '--customerAgentEnabled [value]',
      'enable/disable the customer support agent (true/false)',
    )
    .option(
      '--customerAgentPrompt <prompt>',
      'set the customer support agent prompt',
    )
    .action(async (websiteIdsOrNames, options) => {
      try {
        await ensureLoggedIn()

        const updates = {}

        if (options.domain !== undefined) updates.domain = options.domain
        if (options.whitelabelDocsUrl !== undefined) updates.whitelabelDocsUrl = options.whitelabelDocsUrl
        if (options.iframeUrl !== undefined) updates.iframeUrl = options.iframeUrl
        if (options.defaultLocale !== undefined) updates.defaultLocale = options.defaultLocale
        if (options.customerAgentEnabled !== undefined) {
          updates.customerAgentEnabled =
            options.customerAgentEnabled !== 'false'
        }
        if (options.customerAgentPrompt !== undefined) {
          updates.customerAgentPrompt = options.customerAgentPrompt
        }

        if (Object.keys(updates).length === 0) {
          console.log(
            'No updates specified. Use --domain, --whitelabelDocsUrl, --iframeUrl, --defaultLocale, --customerAgentEnabled, or --customerAgentPrompt.',
          )

          return
        }

        await websiteIdsOrNames.reduce(async (previous, websiteIdOrName) => {
          await previous
          const website = await getWebsite(websiteIdOrName)

          if (!website) {
            console.log(`Website ${websiteIdOrName} not found`)

            return
          }

          await updateWebsite({ ...website, ...updates })
          const name = website.name || website.domain || website._id
          const changes = Object.entries(updates)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ')
          console.log(`Updated ${name} (${website._id}): ${changes}`)
        }, Promise.resolve())
      } catch (error) {
        console.log('error', error)
      }
    })

  return command
}

module.exports = websitesCommand
