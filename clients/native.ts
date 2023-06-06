import { type Collection as NativeCollection, MongoClient as NativeClient } from '../deps.ts'
import type { Document } from '../types.ts'

import {
  BulkOperation,
  MongoCollectionClient,
  MongoDatabaseClient,
  MongoInstanceClient,
} from './types.ts'

export class MongoClient implements MongoInstanceClient {
  private nativeClient: NativeClient

  constructor({ url }: { url: string }) {
    this.nativeClient = new NativeClient(url)
  }

  connect() {
    return this.nativeClient.connect()
  }

  db(name: string): MongoDatabaseClient {
    const db = this.nativeClient.db(name)
    return {
      createIndex({ name, spec }) {
        return db.createIndex(name, spec)
      },
      drop() {
        return db.dropDatabase()
      },
      collection<T extends Document>(name: string) {
        const collection = db.collection<T>(name)
        return new Collection<T>(collection)
      },
    }
  }
}

class Collection<T extends Document> implements MongoCollectionClient<T> {
  constructor(private collection: NativeCollection<T>) {}

  async insertOne(doc: T) {
    // deno-lint-ignore no-explicit-any
    const res = await this.collection.insertOne(doc as any)
    return { insertedId: res.insertedId as unknown as string }
  }

  async insertMany(docs: T[]) {
    // deno-lint-ignore no-explicit-any
    const res = await this.collection.insertMany(docs as any)
    return { insertedIds: Object.values(res) }
  }

  async findOne(
    filter: Document,
    options: { projection?: Document | undefined },
  ) {
    const res = await this.collection.findOne(filter, options)
    return res ? (res as T) : null
  }

  async find(
    filter?: Document | undefined,
    options?:
      | {
        projection?: Document | undefined
        sort?: Document | undefined
        limit?: number | undefined
        skip?: number | undefined
      }
      | undefined,
  ) {
    const res = await this.collection.find(filter || {}, options).toArray()
    return res as T[]
  }

  async replaceOne(
    filter: Document,
    replacement: Document,
    options: { upsert?: boolean | undefined },
  ): Promise<{
    matchedCount: number
    modifiedCount: number
    upsertedId?: string | undefined
  }> {
    const res = await this.collection.replaceOne(
      filter,
      // deno-lint-ignore no-explicit-any
      replacement as any,
      options,
    )
    return res as {
      matchedCount: number
      modifiedCount: number
      upsertedId?: string | undefined
    }
  }

  async deleteOne(filter: Document) {
    const res = await this.collection.deleteOne(filter)
    return res
  }

  async deleteMany(filter: Document) {
    const res = await this.collection.deleteMany(filter)
    return res
  }

  async bulk(operations: BulkOperation[]): Promise<boolean> {
    // deno-lint-ignore no-explicit-any
    await this.collection.bulkWrite(operations as any)
    return true
  }

  async aggregate<T = Document>(pipeline: Document[]) {
    const res = await this.collection.aggregate(pipeline).toArray()
    return res as T[]
  }

  async countDocuments(
    filter?: Document | undefined,
    options?:
      | { limit?: number | undefined; skip?: number | undefined }
      | undefined,
  ) {
    const res = await this.collection.countDocuments(filter, options)
    return res
  }
}
