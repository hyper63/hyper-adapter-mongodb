import type { AdapterConfig } from './types.ts'
import PORT_NAME from './port_name.ts'

import { AtlasClient } from './clients/atlas.ts'
import { NativeClient } from './clients/native.ts'
import type { MongoInstanceClient } from './clients/types.ts'

import { adapter } from './adapter.ts'
import { MetaDb } from './meta.ts'

const isNative = (url: URL) => /^mongodb/.test(url.protocol)
const isAtlas = (url: URL) => /^https/.test(url.protocol)

export default (config: AdapterConfig) => ({
  id: 'mongodb',
  port: PORT_NAME,
  load: async () => {
    const url = new URL(config.url)
    let client: NativeClient | AtlasClient

    if (isNative(url)) {
      client = new NativeClient({ url: config.url })
      await client.connect()
    } else if (isAtlas(url)) {
      if (!config.options?.atlas) {
        throw new Error(
          'options.atlas is required when using an Atlas Data url',
        )
      }
      client = new AtlasClient({
        ...config.options.atlas,
        endpoint: config.url,
        fetch,
      })
    } else {
      throw new Error(
        `provided url is not a valid MongoDB connection string or Atlas Data url`,
      )
    }

    return Promise.resolve({
      client,
      meta: new MetaDb({
        client,
        metaDbName: 'meta-cl1ld3td500003e68rc2f8o6x',
      }),
    })
  }, // load env
  link: (env: { client: MongoInstanceClient; meta: MetaDb }) => (_: unknown) => adapter(env), // link adapter
})
