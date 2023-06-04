import type { AdapterConfig } from './types.ts'
import PORT_NAME from './port_name.ts'

import { MongoClient as AtlasClient } from './clients/atlas.ts'
import { MongoClient as NativeClient } from './clients/native.ts'

import { adapter } from './adapter.js'

const isNative = (url: URL) => /^mongodb/.test(url.protocol)
const isAtlas = (url: URL) => /^https/.test(url.protocol)

export default (config: AdapterConfig) => ({
  id: 'mongodb',
  port: PORT_NAME,
  load: async () => {
    const url = new URL(config.url)
    let client: NativeClient | AtlasClient

    if (isNative(url)) {
      client = new NativeClient(config.url)
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

    return Promise.resolve(client)
  }, // load env
  link: (env: NativeClient | AtlasClient) => (_: unknown) => adapter(env), // link adapter
})
