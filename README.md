<h1 align="center">hyper-adapter-mongodb</h1>
<p>A hyper data port adapter that uses mongodb in the <a href="https://hyper.io">hyper</a> service framework</p>

<p align="center">
  <a href="https://nest.land/package/hyper-adapter-mongodb"><img src="https://nest.land/badge.svg" alt="Nest Badge" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-mongodb/actions/workflows/test-and-publish.yml"><img src="https://github.com/hyper63/hyper-adapter-mongodb/actions/workflows/test-and-publish.yml/badge.svg" alt="Test" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-mongodb/tags/"><img src="https://img.shields.io/github/tag/hyper63/hyper-adapter-mongodb" alt="Current Version" /></a>
</p>

---

<!-- toc -->

- [Background](#background)
- [Getting Started](#getting-started)
  - [MongoDB In-Memory](#mongodb-in-memory)
- [Installation](#installation)
- [Features](#features)
- [Methods](#methods)
- [Contributing](#contributing)
- [Testing](#testing)
  - [Integration Tests](#integration-tests)
- [TODO](#todo)
- [License](#license)

<!-- tocstop -->

## Background

MongoDB is a NoSQL database that is very popular in the developer ecosystem. With this adapter, you
will be able to use MongoDB as your data store for your hyper applications.

For more information on MongoDB: https://www.mongodb.com/

## Getting Started

create `hyper.config.js`

```js
import { default as mongo } from 'https://raw.githubusercontent.com/hyper63/hyper-adapter-mongodb/{TAG}/mod.ts'

const connectionString = Deno.env.get('MONGODB_URL')

export default {
  app: express,
  adapter: [
    {
      port: 'data',
      plugins: [mongo({ url: connectionString })],
    },
  ],
}
```

create `mod.js`

```js
import core from 'https://raw.githubusercontent.com/hyper63/hyper/hyper%40v4.3.2/packages/core/mod.ts'
import config from './hyper.config.js'

core(config)
```

### MongoDB In-Memory

This adapter supports dynamically starting a local MongoDB server, running in memory. This is a
great option for running a hyper Server locally, without needing to also spin up MongoDB locally
(this what [hyper-nano](https://github.com/hyper63/hyper/tree/main/images/nano) is doing underneath
the hood).

To start a local MongoDB server, simply pass the `dir` option to the adapter. You can also specify
`dirVersion` to specify the version of MongoDB to spin up locally.

```js
import { default as mongo } from 'https://raw.githubusercontent.com/hyper63/hyper-adapter-mongodb/{TAG}/mod.ts'

export default {
  app: express,
  adapter: [
    {
      port: 'data',
      plugins: [mongo({ dir: '__hyper__', dirVersion: '7.0.4' })],
    },
  ],
}
```

The adapter will dynamically download the corresponding MongoDB binary, start it, then generate a
connection string that the adapter will use to connect to it.

> The MongoDB binary is downloaded and cached in `dir`, if it does not already exist. This may take
> some time the first startup, but then is fast after caching. MongoDB data is stored in
> `{dir}/data`. The binary plus the internal MongoDB data can typically require a non-trivial amount
> of disk, around 500MB.

## Installation

This is a Deno module available to import from Github via Git Tags

deps.js

```
export { default as mongodb } from "https://raw.githubusercontent.com/hyper63/hyper-adapter-mongodb/{TAG}/mod.ts"
```

## Features

- Create a `MongoDb` database
- Remove a `MongoDb` database
- Create a document
- Retrieve a document
- Update a document
- Remove a document
- List documents
- Query documents
- Index documents
- Bulk manage documents

## Methods

This adapter fully implements the Data port and can be used as the
[hyper Data Service](https://docs.hyper.io/data-api) adapter

See the full port [here](https://github.com/hyper63/hyper/tree/main/packages/port-data)

## Contributing

Contributions are welcome! See the hyper
[contribution guide](https://docs.hyper.io/oss/contributing-to-hyper)

## Testing

Run the unit tests, lint, and check formatting run:

```sh
deno task test
```

### Integration Tests

> If you're developing in [`Gitpod`](https://gitpod.io), a MongoDB instance is automatically started
> for you

To run the integration tests, you will need an instance of MongoDB running, along with setting
`MONGO_URL` to your connection string. For convenience you may use the `Dockerfile` in `.mongodb`
directory:

```sh
docker build -t hyper-mongodb .mongodb
docker run -it -p 27017:27017 hyper-mongodb
```

You can also use a MongoDB Atlas Instance, as long your `MONGO_URL` is set to the correct connection
string.

To run the tests on the adapter methods run:

```sh
deno task test:integration-native
```

## TODO

- Implement support for
  [MongoDB Atlas Data API](https://www.mongodb.com/docs/atlas/app-services/data-api/). See
  [this issue](https://github.com/hyper63/hyper-adapter-mongodb/issues/36)

## License

Apache-2.0
