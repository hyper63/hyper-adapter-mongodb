// Harness deps
import { default as hyper } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper%40v4.1.0/packages/core/mod.ts'
import { default as app } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-app-express%40v1.1.0/packages/app-express/mod.ts'

import mongo from '../mod.ts'
import PORT_NAME from '../port_name.ts'

const hyperConfig = {
  app,
  middleware: [],
  adapters: [
    { port: PORT_NAME, plugins: [mongo({ url: 'mongodb://127.0.0.1:27017' })] },
  ],
}

hyper(hyperConfig)
