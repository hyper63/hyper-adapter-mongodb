<h1 align="center">hyper-adapter-mongodb</h1>
<p>A hyper data port adapter that uses mongodb in the <a href="https://hyper.io">hyper</a> service framework</p>

<p align="center">
  <a href="https://nest.land/package/hyper-adapter-mongodb"><img src="https://nest.land/badge.svg" alt="Nest Badge" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-mongodb/actions/workflows/test.yml"><img src="https://github.com/hyper63/hyper-adapter-mongodb/actions/workflows/test.yml/badge.svg" alt="Test" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-mongodb/tags/"><img src="https://img.shields.io/github/tag/hyper63/hyper-adapter-mongodb" alt="Current Version" /></a>
</p>

---

## Table of Contents

- [Background](#background)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Features](#features)
- [Methods](#methods)
- [Contributing](#contributing)
- [License](#license)

## Background

mongodb is a NoSQL database that is very popular in the developer ecosystem. With this adapter, you will be able to use mongodb as your data store for your hyper applications.

For more information on MongoDB: https://www.mongodb.com/

## Getting Started

create `hyper.config.js`

``` js
import { default as mongo } from 'https://x.nest.land/hyper-adapter-mongodb@0.0.1/mod.js';

const connectionString = Deno.env.get('MONGODB_URL')

export default {
  app: opine,
  adapter: [
    {
      port: 'data', plugins: [mongo(connectionString)]
    }
  ]
}

```

create `mod.js`

``` js
import core from 'https://x.nest.land/hyper@1.3.12/mod.js'
import config from './hyper.config.js'

core(config)

```

## Installation

This is a Deno module available to import from [nest.land](https://nest.land/package/hyper-adapter-mongodb)

deps.js

```
export { default as mongodb } from "https://x.nest.land/hyper-adapter-mongodb@0.0.1/mod.js"
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

This adapter fully implements the Data port and can be used as the [hyper Data Service](https://docs.hyper.io/data-api) adapter

See the full port [here](https://nest.land/packages/hyper-port-data)

## Contributing

Contributions are welcome! See the hyper [contribution guide](https://docs.hyper.io/contributing-to-hyper)

## Testing

```
./scripts/test.sh
```

To lint, check formatting, and run unit tests

## License

Apache-2.0
