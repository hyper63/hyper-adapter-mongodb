import { adapter } from './adapter.js'
import { assert, assertEquals } from './dev_deps.js'
import { MongoClient } from './deps.js'

const { test } = Deno


const client = new MongoClient()
await client.connect('mongodb://127.0.0.1:27017')

const a = adapter(client)

test('create database', async () => {
  const result = await a.createDatabase("hyper~movies")
  assert(result.ok)
})

test('remove database', async () => {
  const result = await a.removeDatabase("hyper~movies")
  assert(result.ok)
})

test('create document', async () => {
  const result = await a.createDocument({
    db: 'hyper~movies',
    id: '1-ghostbusters',
    doc: { title: 'Ghostbusters', year: '1980', genre: ['comedy', 'sci-fi'] }
  })
  assert(result.ok)
  assertEquals(result.id, '1-ghostbusters')
  // cleanup
  await a.removeDocument({ db: 'hyper~movies', id: result.id })
})
