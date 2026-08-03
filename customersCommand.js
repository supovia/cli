/* Copyright 2025 Supovia LLC */
const { inspect } = require('node:util')
const commander = require('commander')
const rehydrateSession = require('./session/rehydrateSession.js')
const isLoggedInSession = require('./session/isLoggedInSession.js')
const login = require('./login.js')
const getConfig = require('./getConfig.js')
const getCustomers = require('@supovia/client/getCustomers.js').default
const getCustomer = require('@supovia/client/getCustomer.js').default

async function ensureLoggedIn() {
  await rehydrateSession()

  if (!isLoggedInSession()) {
    console.log('Please login first')
    await login()
    await rehydrateSession()
  }
}

function customersCommand() {
  const command = new commander.Command('customers')
  command.description('manage customers')

  // supovia customers list
  command
    .command('list')
    .description('list customers')
    .option('--websiteId [websiteId]', 'website id')
    .option('--email [email]', 'filter by email')
    .option('-n, --limit [limit]', 'limit number of results')
    .action(async options => {
      try {
        await ensureLoggedIn()

        const config = getConfig()
        const websiteId = options.websiteId || config?.websiteId

        const parameters = {}
        if (websiteId) parameters.websiteId = websiteId
        if (options.email) parameters.email = options.email

        let customers = await getCustomers(parameters)

        if (options.limit) {
          customers = customers.slice(0, parseInt(options.limit, 10))
        } else {
          customers = customers.slice(0, 10)
        }

        if (customers.length === 0) {
          console.log('No customers found')
        } else {
          console.log(`Found ${customers.length} customer(s):`)
          customers.forEach((cust, index) => {
            const name = cust.nickname || cust.email || cust.phone || cust._id
            const extra = cust.email && cust.nickname ? ` (${cust.email})` : ''
            console.log(`${index + 1}. ${name}${extra} (${cust._id})`)
          })
        }
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia customers get [customerId]
  command
    .command('get [customerId]')
    .description('get customers (raw JSON), or a single customer by id')
    .option('--websiteId [websiteId]', 'website id')
    .option('--email [email]', 'filter by email')
    .option('-n, --limit [limit]', 'limit number of results')
    .action(async (customerId, options) => {
      try {
        await ensureLoggedIn()

        if (customerId) {
          const customer = await getCustomer(customerId)

          if (customer) {
            console.log(inspect(customer, { colors: true, depth: null }))
          } else {
            console.log('Customer not found')
          }
        } else {
          const config = getConfig()
          const websiteId = options.websiteId || config?.websiteId
          const parameters = {}
          if (websiteId) parameters.websiteId = websiteId
          if (options.email) parameters.email = options.email
          let customers = await getCustomers(parameters)
          if (options.limit) {
            customers = customers.slice(0, parseInt(options.limit, 10))
          } else {
            customers = customers.slice(0, 10)
          }
          console.log(inspect(customers, { colors: true, depth: null }))
        }
      } catch (error) {
        console.log('error', error)
      }
    })

  // supovia customers read <customerId>
  command
    .command('read <customerId>')
    .description('read a customer formatted for the terminal')
    .action(async customerId => {
      try {
        await ensureLoggedIn()

        const customer = await getCustomer(customerId)

        if (!customer) {
          console.log('Customer not found')

          return
        }

        const dim = text => `\x1b[2m${text}\x1b[0m`
        const bold = text => `\x1b[1m${text}\x1b[0m`
        const cyan = text => `\x1b[36m${text}\x1b[0m`

        console.log()
        const name = customer.nickname || customer.email || customer.phone || customer._id
        console.log(bold(name))
        console.log(dim(customer._id))
        console.log()

        const fields = []
        if (customer.email) fields.push(`${cyan('email')}  ${customer.email}`)
        if (customer.phone) fields.push(`${cyan('phone')}  ${customer.phone}`)
        if (customer.nickname) fields.push(`${cyan('nickname')}  ${customer.nickname}`)
        if (customer.language) fields.push(`${cyan('language')}  ${customer.language}`)
        if (customer.country) fields.push(`${cyan('country')}  ${customer.country}`)
        if (customer.userId) fields.push(`${cyan('userId')}  ${customer.userId}`)
        if (customer.websiteId) fields.push(`${cyan('websiteId')}  ${customer.websiteId}`)
        if (customer.organizationId) fields.push(`${cyan('organizationId')}  ${customer.organizationId}`)
        if (customer.creationTime) fields.push(`${cyan('created')}  ${customer.creationTime}`)
        if (customer.lastEditTime) fields.push(`${cyan('edited')}   ${customer.lastEditTime}`)

        if (fields.length > 0) {
          fields.forEach(line => console.log(line))
        }

        console.log()
      } catch (error) {
        console.log('error', error)
      }
    })

  return command
}

module.exports = customersCommand
