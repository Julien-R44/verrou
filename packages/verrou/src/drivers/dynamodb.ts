import {
  ConditionalCheckFailedException,
  CreateTableCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb'

import { E_RELEASE_NOT_OWNED } from '../errors.js'
import type { DynamoDbOptions } from '../types/drivers.js'
import type { Duration, LockStore } from '../types/main.js'

/**
 * Create a DynamoDB store.
 */
export function dynamodbStore(config: DynamoDbOptions) {
  return { factory: () => new DynamoDBStore(config) }
}

export class DynamoDBStore implements LockStore {
  #initialized: Promise<any>

  /**
   * DynamoDB client
   */
  #client: DynamoDBClient

  /**
   * DynamoDB table name
   */
  #tableName: string

  constructor(config: DynamoDbOptions) {
    this.#tableName = config.table.name

    this.#client = new DynamoDBClient({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.endpoint,
    })

    this.#initialized = this.#createTableIfNotExists()
  }

  /**
   * Automatically create the Dynamo table if it does not exist.
   */
  async #createTableIfNotExists() {
    const command = new CreateTableCommand({
      TableName: this.#tableName,
      KeySchema: [{ AttributeName: 'key', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'key', AttributeType: 'S' }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 4,
        WriteCapacityUnits: 4,
      },
    })

    try {
      await this.#client.send(command)
    } catch (error) {
      if (error instanceof ResourceInUseException) return
      throw error
    }
  }

  /**
   * Get the current owner of a lock
   */
  async #getCurrentOwner(key: string) {
    await this.#initialized
    const command = new GetItemCommand({
      TableName: this.#tableName,
      Key: { key: { S: key } },
    })

    const result = await this.#client.send(command)
    return result.Item?.owner?.S
  }

  /**
   * Save a lock
   */
  async save(key: string, owner: string) {
    await this.#initialized

    try {
      const command = new PutItemCommand({
        TableName: this.#tableName,
        Item: { key: { S: key }, owner: { S: owner } },
        ConditionExpression: 'attribute_not_exists(#key)',
        ExpressionAttributeNames: { '#key': 'key' },
      })

      const result = await this.#client.send(command)
      return result.$metadata.httpStatusCode === 200
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) return false
      throw err
    }
  }

  /**
   * Delete a lock
   */
  async delete(key: string, owner: string) {
    const currentOwner = await this.#getCurrentOwner(key)
    if (currentOwner !== owner) throw new E_RELEASE_NOT_OWNED()

    const command = new DeleteItemCommand({
      TableName: this.#tableName,
      Key: { key: { S: key } },
    })

    await this.#client.send(command)
  }

  /**
   * Check if a lock exists
   */
  async exists(key: string) {
    await this.#initialized
    const command = new GetItemCommand({
      TableName: this.#tableName,
      Key: { key: { S: key } },
    })

    const result = await this.#client.send(command)
    return result.Item !== undefined
  }

  async extend(_key: string, _duration: Duration) {
    throw new Error('Method not implemented.')
  }
}
