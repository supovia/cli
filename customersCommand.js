/* Copyright 2025 Supovia LLC */
import { inspect } from 'node:util'

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import getCustomer from '@supovia/client/getCustomer.js'
import getCustomers from '@supovia/client/getCustomers.js'
import commander from 'commander'

import ensureAuth from './ensureAuth.js'
import getConfig from './getConfig.js'

function customersCommand() {
  const command = new commander.Command('customers')
  command.description('manage customers')

  // supovia customers list
  withJson(
    command
      .command('list')
      .description('list customers')
      .option('--websiteId [websiteId]', 'website id')
      .option('--email [email]', 'filter by email')
      .option('-n, --limit [limit]', 'limit number of results'),
  ).action(async options => {
    const { json } = options
    try {
      await ensureAuth()

      const config = getConfig()
      const websiteId = options.websiteId || config?.websiteId

      const parameters = {}
      if (websiteId) {
        parameters.websiteId = websiteId
      }
      if (options.email) {
        parameters.email = options.email
      }

      let customers = await getCustomers(parameters)

      if (options.limit) {
        customers = customers.slice(0, parseInt(options.limit, 10))
      } else {
        customers = customers.slice(0, 10)
      }

      if (json) {
        printJson(customers)
      } else if (customers.length === 0) {
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
      fail(error, { json })
    }
  })

  // supovia customers get [customerId]
  withJson(
    command
      .command('get [customerId]')
      .description('get customers (raw JSON), or a single customer by id')
      .option('--websiteId [websiteId]', 'website id')
      .option('--email [email]', 'filter by email')
      .option('-n, --limit [limit]', 'limit number of results'),
  ).action(async (customerId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      if (customerId) {
        const customer = await getCustomer(customerId)

        if (customer) {
          if (json) {
            printJson(customer)
          } else {
            console.log(inspect(customer, { colors: true, depth: null }))
          }
        } else if (json) {
          fail(new Error('Customer not found'), { json })
        } else {
          console.log('Customer not found')
        }
      } else {
        const config = getConfig()
        const websiteId = options.websiteId || config?.websiteId
        const parameters = {}
        if (websiteId) {
          parameters.websiteId = websiteId
        }
        if (options.email) {
          parameters.email = options.email
        }
        let customers = await getCustomers(parameters)
        if (options.limit) {
          customers = customers.slice(0, parseInt(options.limit, 10))
        } else {
          customers = customers.slice(0, 10)
        }
        if (json) {
          printJson(customers)
        } else {
          console.log(inspect(customers, { colors: true, depth: null }))
        }
      }
    } catch (error) {
      fail(error, { json })
    }
  })

  // supovia customers read <customerId>
  withJson(
    command
      .command('read <customerId>')
      .description('read a customer formatted for the terminal'),
  ).action(async (customerId, options) => {
    const { json } = options
    try {
      await ensureAuth()

      const customer = await getCustomer(customerId)

      if (!customer) {
        if (json) {
          fail(new Error('Customer not found'), { json })
        } else {
          console.log('Customer not found')
        }

        return
      }

      if (json) {
        printJson(customer)

        return
      }

      const dim = text => `\x1b[2m${text}\x1b[0m`
      const bold = text => `\x1b[1m${text}\x1b[0m`
      const cyan = text => `\x1b[36m${text}\x1b[0m`

      console.log()
      const name =
        customer.nickname || customer.email || customer.phone || customer._id
      console.log(bold(name))
      console.log(dim(customer._id))
      console.log()

      const fields = []
      if (customer.email) {
        fields.push(`${cyan('email')}  ${customer.email}`)
      }
      if (customer.phone) {
        fields.push(`${cyan('phone')}  ${customer.phone}`)
      }
      if (customer.nickname) {
        fields.push(`${cyan('nickname')}  ${customer.nickname}`)
      }
      if (customer.language) {
        fields.push(`${cyan('language')}  ${customer.language}`)
      }
      if (customer.country) {
        fields.push(`${cyan('country')}  ${customer.country}`)
      }
      if (customer.userId) {
        fields.push(`${cyan('userId')}  ${customer.userId}`)
      }
      if (customer.websiteId) {
        fields.push(`${cyan('websiteId')}  ${customer.websiteId}`)
      }
      if (customer.organizationId) {
        fields.push(`${cyan('organizationId')}  ${customer.organizationId}`)
      }
      if (customer.creationTime) {
        fields.push(`${cyan('created')}  ${customer.creationTime}`)
      }
      if (customer.lastEditTime) {
        fields.push(`${cyan('edited')}   ${customer.lastEditTime}`)
      }

      if (fields.length > 0) {
        fields.forEach(line => console.log(line))
      }

      console.log()
    } catch (error) {
      fail(error, { json })
    }
  })

  return command
}

export default customersCommand
