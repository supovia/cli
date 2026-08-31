/* Copyright 2025 Supovia LLC */
import fs from 'node:fs'
import { inspect } from 'node:util'

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import addOrUpdateDocument from '@supovia/client/addOrUpdateDocument.js'
import getDocument from '@supovia/client/getDocument.js'
import getDocuments from '@supovia/client/getDocuments.js'
import commander from 'commander'
import inquirer from 'inquirer'

import ensureAuth from './ensureAuth.js'
import getConfig from './getConfig.js'

// A document body is one string plus a sibling `contentFormat` discriminator.
// These constants and the resolver below mirror
// `supovia/shared/documentContentFormat.js`, which is the source of truth; this
// package declares no workspace dependencies (esbuild bundles the CLI and only
// @supovia/client comes along) so the handful of values is copied instead.
const DOCUMENT_CONTENT_FORMAT_HTML = 'html'
const DOCUMENT_CONTENT_FORMAT_MARKDOWN = 'markdown'
const DOCUMENT_CONTENT_FORMAT_PLAIN_TEXT = 'plain-text'

// An absent or unrecognized marker means html: every document written before
// the field existed is html and carries nothing.
const DOCUMENT_CONTENT_FORMAT_FALLBACK = DOCUMENT_CONTENT_FORMAT_HTML

// What `docs add` writes unless told otherwise, so the html corpus stops
// growing.
const DOCUMENT_CONTENT_FORMAT_DEFAULT = DOCUMENT_CONTENT_FORMAT_MARKDOWN

const DOCUMENT_CONTENT_FORMATS = [
  DOCUMENT_CONTENT_FORMAT_HTML,
  DOCUMENT_CONTENT_FORMAT_MARKDOWN,
  DOCUMENT_CONTENT_FORMAT_PLAIN_TEXT,
]

// 'plain-text' is deliberately not offered: supovia/api stamps it on
// host-integration writes and a partial unique Mongo index keys off that exact
// value, so an operator setting or clearing it would move rows in and out of a
// uniqueness constraint.
const DOCUMENT_CONTENT_FORMATS_AUTHORABLE = [
  DOCUMENT_CONTENT_FORMAT_MARKDOWN,
  DOCUMENT_CONTENT_FORMAT_HTML,
]

function documentContentFormat(document) {
  const format = document?.contentFormat

  return DOCUMENT_CONTENT_FORMATS.includes(format)
    ? format
    : DOCUMENT_CONTENT_FORMAT_FALLBACK
}

// --- HTML-ONLY BLOCK — delete with the html format ---
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
// --- end HTML-ONLY BLOCK ---

// Deliberately lighter than `stripMarkdownToPlainText` in
// `supovia/shared/documentToPlainText.js`: that one feeds an embedder, this one
// feeds a human reading a terminal. So the code inside a fence survives (only
// the fence lines go), an image keeps its alt text, and a list keeps the same
// `  - ` bullet `stripHtml` above gives `<li>`.
function stripMarkdown(markdown) {
  return markdown
    .replace(/^[ \t]{0,3}(?:```|~~~).*$/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}>[ \t]?/gm, '')
    .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, '  - ')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/~~([^~]*)~~/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function documentToTerminalText(document) {
  const content = document?.content || ''
  const format = documentContentFormat(document)

  if (format === DOCUMENT_CONTENT_FORMAT_MARKDOWN) {
    return stripMarkdown(content)
  }

  // --- HTML-ONLY BLOCK — delete with the html format ---
  if (format === DOCUMENT_CONTENT_FORMAT_HTML) {
    return stripHtml(content)
  }
  // --- end HTML-ONLY BLOCK ---

  // 'plain-text' — host-integration content, already prose.
  return String(content).trim()
}

async function fetchDocument(idOrSlug, options) {
  let doc

  try {
    const parameters = {}
    if (options.locale) {
      parameters.locale = options.locale
    }
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
  withJson(
    command
      .command('list')
      .description('list all documents')
      .option('--websiteId [websiteId]', 'website id')
      .option('-l, --locale [locale]', 'filter by locale')
      .option('-s, --slug [slug]', 'filter by slugOriginal'),
  ).action(async options => {
    const { json } = options
    try {
      await ensureAuth()

      const config = getConfig()
      const websiteId = options.websiteId || config?.websiteId

      const parameters = { websiteId }
      if (options.locale) {
        parameters.locale = options.locale
      }

      let documents = await getDocuments(parameters)

      if (options.slug) {
        documents = documents.filter(doc => doc.slugOriginal === options.slug)
      }

      if (json) {
        printJson(documents)
      } else if (documents.length === 0) {
        console.log('No documents found')
      } else {
        console.log(`Found ${documents.length} document(s):`)
        documents.forEach((doc, index) => {
          console.log(`${index + 1}. ${doc.title || doc._id} (${doc._id})`)
        })
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia docs get [idOrSlug]
  withJson(
    command
      .command('get [idOrSlug]')
      .description(
        'get documents (raw JSON), or a single document by id or slug',
      )
      .option('--websiteId [websiteId]', 'website id')
      .option('-l, --locale [locale]', 'filter by locale')
      .option('-s, --slug [slug]', 'filter by slugOriginal')
      .option('-n, --limit [limit]', 'limit number of results'),
  ).action(async (idOrSlug, options) => {
    const { json } = options
    try {
      await ensureAuth()

      if (idOrSlug) {
        const doc = await fetchDocument(idOrSlug, options)

        if (doc) {
          if (json) {
            printJson(doc)
          } else {
            console.log(inspect(doc, { colors: true, depth: null }))
          }
        } else if (json) {
          fail(new Error('Document not found'), { json })
        } else {
          console.log('Document not found')
        }
      } else {
        const config = getConfig()
        const websiteId = options.websiteId || config?.websiteId
        const parameters = { limit: options.limit || 10 }
        if (websiteId) {
          parameters.websiteId = websiteId
        }
        if (options.locale) {
          parameters.locale = options.locale
        }
        let documents = await getDocuments(parameters)
        if (options.slug) {
          documents = documents.filter(doc => doc.slugOriginal === options.slug)
        }
        if (json) {
          printJson(documents)
        } else {
          console.log(inspect(documents, { colors: true, depth: null }))
        }
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia docs read <idOrSlug>
  withJson(
    command
      .command('read <idOrSlug>')
      .description('read a document formatted for the terminal')
      .option('-l, --locale [locale]', 'locale for slug lookup'),
  ).action(async (idOrSlug, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const doc = await fetchDocument(idOrSlug, options)

      if (!doc) {
        if (json) {
          fail(new Error('Document not found'), { json })
        } else {
          console.log('Document not found')
        }

        return
      }

      if (json) {
        printJson(doc)

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
        console.log(documentToTerminalText(doc))
        console.log()
      }

      const meta = []
      if (doc.slugOriginal) {
        meta.push(`${cyan('slugOriginal')}  ${doc.slugOriginal}`)
      }
      if (doc.originalDocumentId) {
        meta.push(`${cyan('originalDocumentId')}  ${doc.originalDocumentId}`)
      }
      if (doc.creationTime) {
        meta.push(`${cyan('created')}  ${doc.creationTime}`)
      }
      if (doc.lastEditTime) {
        meta.push(`${cyan('edited')}   ${doc.lastEditTime}`)
      }
      if (doc.googleTranslate) {
        meta.push(`${cyan('googleTranslate')}  true`)
      }

      if (meta.length > 0) {
        console.log(dim('---'))
        meta.forEach(line => console.log(line))
      }

      console.log()
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia docs add
  withJson(
    command
      .command('add')
      .description('add a new document')
      .option('--title [title]', 'document title')
      .option('--content [content]', 'document content (inline string)')
      .option(
        '--content-file <path>',
        'path to a file whose contents become the document content',
      )
      .option(
        '--format <format>',
        `content syntax (${DOCUMENT_CONTENT_FORMATS_AUTHORABLE.join(' or ')})`,
        DOCUMENT_CONTENT_FORMAT_DEFAULT,
      )
      .option('--websiteId [websiteId]', 'website id'),
  ).action(async options => {
    const { json } = options
    try {
      await ensureAuth()

      const config = getConfig()

      if (!DOCUMENT_CONTENT_FORMATS_AUTHORABLE.includes(options.format)) {
        // Naming 'plain-text' here would be worse than a typo: it is the marker
        // supovia/api stamps on host-integration writes, and a partial unique
        // index keys off it.
        fail(
          new Error(
            `--format must be one of ${DOCUMENT_CONTENT_FORMATS_AUTHORABLE.join(
              ', ',
            )}`,
          ),
          { json },
        )

        return
      }

      // A markdown body is multi-line, so `--content` on a shell is hostile;
      // polyblog/cli/articlesCommand.js reads its article bodies the same way.
      const contentFromFile = options.contentFile
        ? fs.readFileSync(options.contentFile, 'utf8')
        : undefined

      const answers = await inquirer.prompt([
        {
          name: 'title',
          message: 'Document title:',
          when: !options.title,
        },
        {
          name: 'content',
          message: 'Document content:',
          when: contentFromFile === undefined && !options.content,
        },
        {
          name: 'websiteId',
          message: 'Website ID:',
          when: !options.websiteId && !config?.websiteId,
        },
      ])

      const title = options.title || answers.title
      const content = contentFromFile ?? (options.content || answers.content)
      const websiteId =
        options.websiteId || config?.websiteId || answers.websiteId

      const document = await addOrUpdateDocument({
        title,
        content,
        contentFormat: options.format,
        websiteId,
      })

      if (json) {
        printJson({ ok: true, id: document._id, title: document.title })
      } else {
        console.log('Document added successfully')
        console.log(`ID: ${document._id}`)
        console.log(`Title: ${document.title}`)
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  return command
}

export default docsCommand
