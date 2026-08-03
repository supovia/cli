/* Copyright 2025 Supovia LLC */
const { inspect } = require('node:util')
const commander = require('commander')
const inquirer = require('inquirer')
const rehydrateSession = require('./session/rehydrateSession.js')
const isLoggedInSession = require('./session/isLoggedInSession.js')
const login = require('./login.js')
const getConfig = require('./getConfig.js')
const getDocument = require('@supovia/client/getDocument.js').default
const getDocuments = require('@supovia/client/getDocuments.js').default
const addOrUpdateDocument = require('@supovia/client/addOrUpdateDocument.js').default

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/?ol>/gi, '')
    .replace(/<\/?ul>/gi, '')
    .replace(/<li>/gi, '  - ')
    .replace(/<video[^>]*>.*?<\/video>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchDocument(idOrSlug, options) {
  let doc

  try {
    const parameters = {}
    if (options.locale) parameters.locale = options.locale
    const originalError = console.error
    console.error = () => {}
    try {
      doc = await getDocument(idOrSlug, parameters)
    } finally {
      console.error = originalError
    }
  } catch {
    // API slug lookup may not support slugOriginal yet, fall back to list
  }

  if (!doc && options.locale) {
    const config = getConfig()
    const websiteId = config?.websiteId
    const documents = await getDocuments({
      websiteId,
      locale: options.locale,
    })
    doc = documents.find(d => d.slugOriginal === idOrSlug)
  }

  return doc
}

function docsCommand() {
  const command = new commander.Command('docs')
  command.description('manage documents')

  // supovia docs list
  command
    .command('list')
    .description('list all documents')
    .option('--websiteId [websiteId]', 'website id')
    .option('-l, --locale [locale]', 'filter by locale')
    .option('-s, --slug [slug]', 'filter by slugOriginal')
    .action(async options => {
      try {
        await rehydrateSession()

        if (!isLoggedInSession()) {
          console.log('Please login first')
          await login()
          await rehydrateSession()
        }

        const config = getConfig()
        const websiteId = options.websiteId || config?.websiteId

        const parameters = { websiteId }
        if (options.locale) parameters.locale = options.locale

        let documents = await getDocuments(parameters)

        if (options.slug) {
          documents = documents.filter(doc => doc.slugOriginal === options.slug)
        }

        if (documents.length === 0) {
          console.log('No documents found')
        } else {
          console.log(`Found ${documents.length} document(s):`)
          documents.forEach((doc, index) => {
            console.log(`${index + 1}. ${doc.title || doc._id} (${doc._id})`)
          })
        }
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia docs get [idOrSlug]
  command
    .command('get [idOrSlug]')
    .description('get documents (raw JSON), or a single document by id or slug')
    .option('--websiteId [websiteId]', 'website id')
    .option('-l, --locale [locale]', 'filter by locale')
    .option('-s, --slug [slug]', 'filter by slugOriginal')
    .option('-n, --limit [limit]', 'limit number of results')
    .action(async (idOrSlug, options) => {
      try {
        await rehydrateSession()

        if (!isLoggedInSession()) {
          console.log('Please login first')
          await login()
          await rehydrateSession()
        }

        if (idOrSlug) {
          const doc = await fetchDocument(idOrSlug, options)

          if (doc) {
            console.log(inspect(doc, { colors: true, depth: null }))
          } else {
            console.log('Document not found')
          }
        } else {
          const config = getConfig()
          const websiteId = options.websiteId || config?.websiteId
          const parameters = { limit: options.limit || 10 }
          if (websiteId) parameters.websiteId = websiteId
          if (options.locale) parameters.locale = options.locale
          let documents = await getDocuments(parameters)
          if (options.slug) {
            documents = documents.filter(doc => doc.slugOriginal === options.slug)
          }
          console.log(inspect(documents, { colors: true, depth: null }))
        }
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia docs read <idOrSlug>
  command
    .command('read <idOrSlug>')
    .description('read a document formatted for the terminal')
    .option('-l, --locale [locale]', 'locale for slug lookup')
    .action(async (idOrSlug, options) => {
      try {
        await rehydrateSession()

        if (!isLoggedInSession()) {
          console.log('Please login first')
          await login()
          await rehydrateSession()
        }

        const doc = await fetchDocument(idOrSlug, options)

        if (!doc) {
          console.log('Document not found')

          return
        }

        const dim = text => `\x1b[2m${text}\x1b[0m`
        const bold = text => `\x1b[1m${text}\x1b[0m`
        const cyan = text => `\x1b[36m${text}\x1b[0m`

        console.log()
        console.log(bold(doc.title))
        console.log(dim(`${doc.locale}  ·  ${doc.slug}  ·  ${doc._id}`))
        console.log()

        if (doc.content) {
          console.log(stripHtml(doc.content))
          console.log()
        }

        const meta = []
        if (doc.slugOriginal) meta.push(`${cyan('slugOriginal')}  ${doc.slugOriginal}`)
        if (doc.originalDocumentId) meta.push(`${cyan('originalDocumentId')}  ${doc.originalDocumentId}`)
        if (doc.creationTime) meta.push(`${cyan('created')}  ${doc.creationTime}`)
        if (doc.lastEditTime) meta.push(`${cyan('edited')}   ${doc.lastEditTime}`)
        if (doc.googleTranslate) meta.push(`${cyan('googleTranslate')}  true`)

        if (meta.length > 0) {
          console.log(dim('---'))
          meta.forEach(line => console.log(line))
        }

        console.log()
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia docs add
  command
    .command('add')
    .description('add a new document')
    .option('--title [title]', 'document title')
    .option('--content [content]', 'document content')
    .option('--websiteId [websiteId]', 'website id')
    .action(async options => {
      try {
        await rehydrateSession()

        if (!isLoggedInSession()) {
          console.log('Please login first')
          await login()
          await rehydrateSession()
        }

        const config = getConfig()

        const answers = await inquirer.prompt([
          {
            name: 'title',
            message: 'Document title:',
            when: !options.title,
          },
          {
            name: 'content',
            message: 'Document content:',
            when: !options.content,
          },
          {
            name: 'websiteId',
            message: 'Website ID:',
            when: !options.websiteId && !config?.websiteId,
          },
        ])

        const title = options.title || answers.title
        const content = options.content || answers.content
        const websiteId = options.websiteId || config?.websiteId || answers.websiteId

        const document = await addOrUpdateDocument({
          title,
          content,
          websiteId,
        })

        console.log('Document added successfully')
        console.log(`ID: ${document._id}`)
        console.log(`Title: ${document.title}`)
      } catch (error) {
        console.log('error', error)
      }
    })

  return command
}

module.exports = docsCommand
