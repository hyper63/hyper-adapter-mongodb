import { join, MongoMemoryServer } from './deps.ts'
import type { AdapterConfig } from './types.ts'
import PORT_NAME from './port_name.ts'

import { AtlasDataClient } from './clients/atlas-data.ts'
import { NativeClient } from './clients/native.ts'
import type { MongoInstanceClient } from './clients/types.ts'

import { mkdir } from './utils.ts'
import { adapter } from './adapter.ts'
import { MetaDb } from './meta.ts'

const isNative = (url: URL) => /^mongodb/.test(url.protocol)
const isAtlas = (url: URL) => /^https/.test(url.protocol)

export default (config: AdapterConfig) => ({
  id: 'mongodb',
  port: PORT_NAME,
  load: async () => {
    let url: URL
    /**
     * Dynamically create an in memory database
     */
    if (config.dir) {
      const mongoMsDir = join(config.dir, 'mongoms')
      await mkdir(join(mongoMsDir, 'data'))
      /**
       * See https://github.com/nodkz/mongodb-memory-server#available-options-for-mongomemoryserver
       * for available options.
       *
       * Other options may
       */
      url = await MongoMemoryServer.create({
        instance: { dbPath: join(mongoMsDir, 'data'), storageEngine: 'wiredTiger' },
        binary: { downloadDir: mongoMsDir, version: config.dirVersion },
      }).then((mongod) => new URL(mongod.getUri()))
    } else {
      url = new URL(config.url as string)
    }
    let client: NativeClient | AtlasDataClient

    if (isNative(url)) {
      client = new NativeClient({ url: url.toString() })
      await client.connect()
    } else if (isAtlas(url)) {
      if (!config.options?.atlas) {
        throw new Error(
          'options.atlas is required when using an Atlas Data url',
        )
      }
      client = new AtlasDataClient({
        ...config.options.atlas,
        endpoint: url.toString(),
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
