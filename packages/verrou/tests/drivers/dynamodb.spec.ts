import { test } from '@japa/runner'
import { DeleteTableCommand, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'

import { DynamoDBStore } from '../../src/drivers/dynamodb.js'
import { registerStoreTestSuite } from '../../src/test_suite.js'

const credentials = {
  region: 'eu-west-3',
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: { accessKeyId: 'foo', secretAccessKey: 'foo' },
}
const config = { ...credentials, table: { name: 'verrou' } }
const dynamoClient = new DynamoDBClient(credentials)

function deleteTableTeardown(tableName: string) {
  return async () => {
    const cmd = new DeleteTableCommand({ TableName: tableName })
    await dynamoClient.send(cmd).catch(() => {})
  }
}

test.group('DynamoDB Store', (group) => {
  group.each.teardown(deleteTableTeardown('verrou'))

  registerStoreTestSuite({ test, config, store: DynamoDBStore })

  test('should automatically create table', async ({ assert }) => {
    const store = new DynamoDBStore(config)

    await store.save('foo', 'bar', 1000)

    const cmd = new GetItemCommand({ TableName: 'verrou', Key: { key: { S: 'foo' } } })
    const { Item: item } = await dynamoClient.send(cmd)

    assert.deepEqual(item!.key.S, 'foo')
    assert.deepEqual(item!.owner.S, 'bar')
  })

  test('should respect the table name', async ({ assert, cleanup }) => {
    const store = new DynamoDBStore({ ...config, table: { name: 'my_locks' } })
    cleanup(deleteTableTeardown('my_locks'))

    await store.save('foo', 'bar', 1000)

    const cmd = new GetItemCommand({ TableName: 'my_locks', Key: { key: { S: 'foo' } } })
    const { Item: item } = await dynamoClient.send(cmd)

    assert.deepEqual(item!.key.S, 'foo')
    assert.deepEqual(item!.owner.S, 'bar')
  })

  test('doesnt throw if table already exists', async () => {
    const store = new DynamoDBStore(config)
    const store2 = new DynamoDBStore(config)

    await store.save('foo', 'bar', 1000)
    await store2.save('foo2', 'bar2', 1000)
  })

  test('null ttl', async ({ assert }) => {
    const store = new DynamoDBStore(config)
    await store.save('foo', 'bar', null)

    const command = new GetItemCommand({
      TableName: 'verrou',
      Key: { key: { S: 'foo' } },
    })

    const { Item } = await dynamoClient.send(command)

    assert.deepEqual(Item!.key.S, 'foo')
    assert.deepEqual(Item!.owner.S, 'bar')
    assert.isUndefined(Item!.expires_at)
  })
})
