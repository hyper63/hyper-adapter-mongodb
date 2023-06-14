import { assert, assertRejects, dataPort, pluginFactory } from './dev_deps.ts'

import { AtlasDataClient } from './clients/atlas-data.ts'
import factory from './mod.ts'
import { MetaDb } from './meta.ts'

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
    await t.step(
      'should construct an AtlasData client and MetaDb client',
      async () => {
        const { client, meta } = await factory(happy).load()
        assert(client instanceof AtlasDataClient)
        assert(meta instanceof MetaDb)
      },
    )

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
