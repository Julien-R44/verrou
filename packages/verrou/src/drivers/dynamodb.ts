import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  ConditionalCheckFailedException,
  CreateTableCommand,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb'

import { E_LOCK_NOT_OWNED } from '../errors.js'
import type { LockStore, DynamoDbOptions } from '../types/main.js'

/**
 * Create a DynamoDB store.
 */
export function dynamodbStore(config: DynamoDbOptions) {
  return { factory: () => new DynamoDBStore(config) }
}

export class DynamoDBStore implements LockStore {
  #initialized: Promise<any>

  /**
   * DynamoDB connection
   */
  #connection: DynamoDBClient

  /**
   * DynamoDB table name
   */
  #tableName: string

  constructor(config: DynamoDbOptions) {
    this.#tableName = config.table.name
    this.#connection = config.connection

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
      await this.#connection.send(command)
    } catch (error) {
      if (error instanceof ResourceInUseException) return
      throw error
    }
  }

  /**
   * Save the lock in the store if not already locked by another owner
   */
  async save(key: string, owner: string, ttl: number | null) {
    await this.#initialized

    try {
      const command = new PutItemCommand({
        TableName: this.#tableName,
        Item: {
          key: { S: key },
          owner: { S: owner },
          ...(ttl ? { expires_at: { N: (Date.now() + ttl).toString() } } : {}),
        },
        ConditionExpression: 'attribute_not_exists(#key) OR #expires_at < :now',
        ExpressionAttributeNames: {
          '#key': 'key',
          '#expires_at': 'expires_at',
        },
        ExpressionAttributeValues: { ':now': { N: Date.now().toString() } },
      })

      const result = await this.#connection.send(command)
      return result.$metadata.httpStatusCode === 200
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) return false
      throw err
    }
  }

  /**
   * Delete the lock from the store if it is owned by the owner
   * Otherwise throws a E_LOCK_NOT_OWNED error
   */
  async delete(key: string, owner: string) {
    const command = new DeleteItemCommand({
      TableName: this.#tableName,
      Key: { key: { S: key } },
      ConditionExpression: '#owner = :owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: { ':owner': { S: owner } },
    })

    try {
      await this.#connection.send(command)
    } catch {
      throw new E_LOCK_NOT_OWNED()
    }
  }

  /**
   * Force delete the lock from the store. No check is made on the owner
   */
  async forceDelete(key: string) {
    const command = new DeleteItemCommand({
      TableName: this.#tableName,
      Key: { key: { S: key } },
    })

    await this.#connection.send(command)
  }

  /**
   * Check if the lock exists
   */
  async exists(key: string) {
    await this.#initialized
    const command = new GetItemCommand({
      TableName: this.#tableName,
      Key: { key: { S: key } },
    })

    const result = await this.#connection.send(command)
    const isExpired = result.Item?.expires_at?.N && result.Item.expires_at.N < Date.now().toString()

    return result.Item !== undefined && !isExpired
  }

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by the owner
   * Duration is in milliseconds
   */
  async extend(key: string, owner: string, duration: number) {
    const command = new PutItemCommand({
      TableName: this.#tableName,
      Item: {
        key: { S: key },
        owner: { S: owner },
        expires_at: { N: (Date.now() + duration).toString() },
      },
      ConditionExpression: '#owner = :owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: { ':owner': { S: owner } },
    })

    try {
      await this.#connection.send(command)
    } catch {
      throw new E_LOCK_NOT_OWNED()
    }
  }
}
