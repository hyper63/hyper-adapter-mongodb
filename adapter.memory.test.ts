import mongo from './mod.ts'

import { suite } from './test/suite.ts'

Deno.test({
  name: 'Mongo Adapter Test Suite - In-Memory',
  fn: async (t) => {
    const { client } = await mongo({ dir: '__hyper__', dirVersion: '7.0.4' }).load()
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
