import { NativeClient } from './clients/native.ts'

import { suite } from './test/suite.ts'

Deno.test({
  name: 'Mongo Adapter Test Suite - NativeClient',
  fn: async (t) => {
    const client = new NativeClient({
      url: Deno.env.get('MONGO_URL') || 'mongodb://127.0.0.1:27017',
    })

    await suite(t)(client, { shouldBaseLine: true })
  },
  /**
   * The native client maintains TCP connections
   * and timers, as part of connecting to Mongo,
   *
   * So we ignore sanitization of these resources
   * and ops, when running tests with the NativeClient
   *
   * See https://deno.com/manual/basics/testing/sanitizers
   */
  sanitizeOps: false,
  sanitizeResources: false,
})
