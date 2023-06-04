import { MongoClient } from './deps.js'
import { adapter } from './adapter.js'
import PORT_NAME from './port_name.js'

export default (mongoUrl) => ({
  id: 'mongodb',
  port: PORT_NAME,
  load: async () => {
    const client = new MongoClient()
    await client.connect(mongoUrl)
    return await client
  }, // load env
  link: (env) => (_) => adapter(env), // link adapter
})
