export type AdapterConfig = {
  url: string
  options?: {
    atlas?: {
      dataSource: string
      auth: EmailPasswordAuthOptions | ApiKeyAuthOptions | CustomJwtAuthOptions
    }
  }
}

// deno-lint-ignore no-explicit-any
export type Document = Record<string, any>

export interface EmailPasswordAuthOptions {
  email: string
  password: string
}

export interface ApiKeyAuthOptions {
  apiKey: string
}

export interface CustomJwtAuthOptions {
  jwtTokenString: string
}

export type AuthOptions =
  | EmailPasswordAuthOptions
  | ApiKeyAuthOptions
  | CustomJwtAuthOptions

export interface MongoCollectionClient<T extends Document> {
  insertOne(doc: T): Promise<{ insertedId: string }>

  insertMany(docs: T[]): Promise<{ insertedIds: string[] }>

  findOne(filter: Document, options: { projection?: Document }): Promise<T>

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
    upsertedId?: string
  }>

  deleteOne(filter: Document): Promise<{ deletedCount: number }>

  deleteMany(filter: Document): Promise<{ deletedCount: number }>

  aggregate<T = Document>(pipeline: Document[]): Promise<T[]>

  countDocuments(
    filter?: Document,
    options?: { limit?: number; skip?: number },
  ): Promise<number>

  api<R = unknown>(method: string, options: Document): Promise<R>
}
