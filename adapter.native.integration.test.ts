import { NativeClient } from './clients/native.ts'

import { suite } from './test/suite.ts'

Deno.test({
  name: 'Mongo Adapter Test Suite - NativeClient',
  fn: async (t) => {
    const url = Deno.env.get('MONGO_URL')
    if (!url) {
      throw new Error('MongoDB connection string is required at MONGO_URL')
    }

    const client = new NativeClient({ url })
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
