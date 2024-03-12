import pino from 'pino'
import { Redis } from 'ioredis'
import { Verrou } from '@verrou/core'
import { setTimeout } from 'node:timers/promises'
import { redisStore } from '@verrou/core/drivers/redis'
import { memoryStore } from '@verrou/core/drivers/memory'

const logger = pino.default({ level: 'debug', transport: { target: 'pino-pretty' } })

logger.info('Hello world')

const ioredis = new Redis({ host: 'localhost', port: 6379 })
const verrou = new Verrou({
  logger,
  default: 'redis',
  stores: {
    memory: { driver: memoryStore() },
    redis: { driver: redisStore({ connection: ioredis }) },
  },
})

const products = [
  { id: '123', name: 'Product A', stock: 10 },
  { id: '456', name: 'Product B', stock: 5 },
]

/**
 * Get a product by its ID.
 * Simulate a database call by waiting 200ms
 */
async function getProduct(productId: string) {
  await setTimeout(200)
  return products.find((product) => product.id === productId)!
}

/**
 * Update the stock of a product
 */
async function updateProductStock(productId: string, stock: number) {
  const product = await getProduct(productId)
  product.stock = stock
}

async function purchaseProduct(productId: string, quantity: number, customerId: string) {
  const lockKey = `product-${productId}`

  await verrou.createLock(lockKey).run(async () => {
    const product = await getProduct(productId)

    if (product.stock >= quantity) {
      // Update the stock
      await updateProductStock(productId, product.stock - quantity)

      // Record the purchase
      console.log(`Customer ${customerId} purchased ${quantity} of ${product.name}`)
      console.log(`New stock for ${product.name} is ${product.stock}`)
    } else {
      console.log(`Not enough stock for ${product.name}. Purchase failed.`)
    }
  })
}

await Promise.all([
  // Simulating two customers trying to purchase the same product at the same time
  purchaseProduct('123', 1, 'CustomerA'),
  purchaseProduct('123', 1, 'CustomerB'),
])

await ioredis.quit()
