import { HyperErr } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-utils%40v0.1.1/packages/utils/hyper-err.js'
import { EJSON } from '../deps.ts'
import type { AuthOptions, Document } from '../types.ts'

import type {
  BulkOperation,
  MongoCollectionClient,
  MongoDatabaseClient,
  MongoInstanceClient,
} from './types.ts'

export class MongoClient implements MongoInstanceClient {
  dataSource: string
  endpoint: string
  fetch = fetch
  headers = new Headers()

  constructor({
    dataSource,
    auth,
    endpoint,
    fetch: customFetch,
  }: {
    dataSource: string
    auth: AuthOptions
    endpoint: string
    fetch?: typeof fetch
  }) {
    this.dataSource = dataSource
    this.endpoint = endpoint

    if (customFetch) this.fetch = customFetch

    this.headers.set('Content-Type', 'application/ejson')
    this.headers.set('Accept', 'application/ejson')

    if ('apiKey' in auth) this.headers.set('api-key', auth.apiKey)
    else if ('jwtTokenString' in auth) {
      this.headers.set('jwtTokenString', auth.jwtTokenString)
    } else if ('email' in auth && 'password' in auth) {
      this.headers.set('email', auth.email)
      this.headers.set('password', auth.password)
    } else {
      throw new Error('Invalid auth options')
    }
  }

  db(name: string) {
    return new Database(name, this)
  }
}

export class Database implements MongoDatabaseClient {
  name: string
  client: MongoClient

  constructor(name: string, client: MongoClient) {
    this.name = name
    this.client = client
  }

  createIndex(): Promise<string> {
    throw HyperErr({
      status: 501,
      msg: 'Atlas Data API does not expose creating indexes. Create indexes via the Atlas Console',
    })
  }

  drop(): Promise<boolean> {
    throw HyperErr({
      status: 501,
      msg:
        'Atlas Data API does not expose dropping a database. Drop databases via the Atlas Console',
    })
  }

  collection<T extends Document = Document>(name: string) {
    return new Collection<T>(name, this)
  }
}

export class Collection<T extends Document> implements MongoCollectionClient<T> {
  name: string
  database: Database
  client: MongoClient

  constructor(name: string, database: Database) {
    this.name = name
    this.database = database
    this.client = database.client
  }

  insertOne(doc: T) {
    return this.api<{ insertedId: string }>('insertOne', { document: doc })
  }

  insertMany(docs: T[]) {
    return this.api<{ insertedIds: string[] }>('insertMany', {
      documents: docs,
    })
  }

  async findOne(
    filter: Document,
    { projection }: { projection?: Document } = {},
  ) {
    const result = await this.api<{ document: T }>('findOne', {
      filter,
      projection,
    })
    return result.document ? result.document : null
  }

  async find(
    filter?: Document,
    {
      projection,
      sort,
      limit,
      skip,
    }: {
      projection?: Document
      sort?: Document
      limit?: number
      skip?: number
    } = {},
  ) {
    const result = await this.api<{ documents: T[] }>('find', {
      filter,
      projection,
      sort,
      limit: limit || 25,
      skip,
    })
    return result.documents
  }

  replaceOne(
    filter: Document,
    replacement: Document,
    { upsert }: { upsert?: boolean } = {},
  ) {
    return this.api<{
      matchedCount: number
      modifiedCount: number
      upsertedId?: string
    }>('replaceOne', {
      filter,
      replacement,
      upsert,
    })
  }

  deleteOne(filter: Document) {
    return this.api<{ deletedCount: number }>('deleteOne', { filter })
  }

  deleteMany(filter: Document) {
    return this.api<{ deletedCount: number }>('deleteMany', { filter })
  }

  /**
   * TODO: need to check if this actually works on Atlas data
   */
  async bulk(operations: BulkOperation[]): Promise<boolean> {
    const _result = await this.api('bulkWrite', { operations })
    return true
  }

  async aggregate<T = Document>(pipeline: Document[]) {
    const result = await this.api<{ documents: T[] }>('aggregate', {
      pipeline,
    })
    return result.documents
  }

  async countDocuments(
    filter?: Document,
    options?: { limit?: number; skip?: number },
  ) {
    const pipeline: Document[] = []
    if (filter) {
      pipeline.push({ $match: filter })
    }

    if (typeof options?.skip === 'number') {
      pipeline.push({ $skip: options.skip })
    }
    if (typeof options?.limit === 'number') {
      pipeline.push({ $limit: options.limit })
    }
    pipeline.push({ $group: { _id: 1, n: { $sum: 1 } } })

    const [result] = await this.aggregate<{ n: number }>(pipeline)
    if (result) return result.n
    return 0
  }

  async api<R = unknown>(method: string, options: Document) {
    const { endpoint, dataSource, headers } = this.client
    const url = `${endpoint}/action/${method}`

    const response = await this.client.fetch(url, {
      method: 'POST',
      headers,
      body: EJSON.stringify({
        collection: this.name,
        database: this.database.name,
        dataSource: dataSource,
        ...options,
      }),
    })

    const body = await response.text()

    if (!response.ok) throw new Error(`${response.statusText}: ${body}`)

    return EJSON.parse(body) as R
  }
}
