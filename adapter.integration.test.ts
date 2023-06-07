import { NativeClient } from './clients/native.ts'

import { suite } from './test/suite.ts'

const client = new NativeClient({ url: Deno.env.get('MONGO_URL') || 'mongodb://127.0.0.1:27017' })
await client.connect()

await suite(client)
