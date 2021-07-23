import { adapter } from './adapter.js'
import { assert } from './dev_deps.js'
import { MongoClient } from './deps.js'

const { test } = Deno

const client = new MongoClient()
await client.connect('mongodb://127.0.0.1:27017')

const a = adapter(client)

test('create database', async () => {
  const result = await a.createDatabase("hyper~movies")
  assert(result.ok)
})