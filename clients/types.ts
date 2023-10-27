import type { Document } from '../types.ts'

export interface MongoInstanceClient {
  db(name: string): MongoDatabaseClient
}

export interface MongoDatabaseClient {
  drop(): Promise<boolean>

  collection<T extends Document = Document>(
    name: string,
  ): MongoCollectionClient<T>
}

export interface MongoCollectionClient<T extends Document> {
  createIndex(
    spec: { [field: string]: 1 | -1 },
    options: { partialFilterExpression?: Document; name: string },
  ): Promise<string>

  insertOne(doc: T): Promise<{ insertedId: string }>

  insertMany(docs: T[]): Promise<{ insertedIds: string[] }>

  findOne(
    filter: Document,
    options: { projection?: Document },
  ): Promise<T | null>

  find(
    filter?: Document,
    options?: {
      projection?: Document
      sort?: Document
      limit?: number
      skip?: number
    },
  ): Promise<T[]>

  replaceOne(
    filter: Document,
    replacement: Document,
    options: { upsert?: boolean },
  ): Promise<{
    matchedCount: number
    modifiedCount: number
    upsertedCount: number
    upsertedId?: string
  }>

  deleteOne(filter: Document): Promise<{ deletedCount: number }>

  deleteMany(filter: Document): Promise<{ deletedCount: number }>

  bulk(operations: BulkOperation[]): Promise<boolean>

  aggregate<T = Document>(pipeline: Document[]): Promise<T[]>

  countDocuments(
    filter?: Document,
    options?: { limit?: number; skip?: number },
  ): Promise<number>
}

export type BulkOperation =
  | { replaceOne: { filter: Document; replacement: Document; upsert: boolean } }
  | { deleteOne: { filter: Document } }
