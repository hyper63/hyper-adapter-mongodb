import { assert, assertRejects, dataPort, pluginFactory } from './dev_deps.ts'

import { MongoClient as AtlasClient } from './clients/atlas.ts'

import factory from './mod.ts'

Deno.test('mod', async (t) => {
  const happy = {
    url: 'https://data.mongodb-api.com/app/foo/endpoint/data/v1',
    options: {
      atlas: {
        dataSource: 'foo',
        auth: {
          apiKey: 'secret',
        },
      },
    },
  }
  await t.step('should implement the factory schema', () => {
    assert(pluginFactory(factory(happy)))
  })

  await t.step('load', async (t) => {
    await t.step('should construct an Atlas Data client', async () => {
      assert((await factory(happy).load()) instanceof AtlasClient)
    })

    await t.step('should throw if the provided url is not valid', async () => {
      await assertRejects(() =>
        factory({
          url: 'foobar://user:pass@cluster0.abcde.mongodb.net/test',
        }).load()
      )
    })

    await t.step('should throw if no atlas options are provided', async () => {
      await assertRejects(() =>
        factory({
          ...happy,
          options: {
            atlas: undefined,
          },
        }).load()
      )
    })
  })

  await t.step('link', async (t) => {
    await t.step('should return a data adapter', async () => {
      const plugin = factory(happy)
      const adapter = plugin.link(await plugin.load())({})

      assert(dataPort(adapter))
    })
  })
})
