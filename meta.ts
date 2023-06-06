import { crocks, HyperErr, R } from './deps.ts'

import type { MongoInstanceClient } from './clients/types.ts'

const { tap } = R
const { Async } = crocks

type DatabaseMeta = {
  _id: string
  name: string
  type: 'database'
  createdAt: string
}

/**
 * MongoDB implicitly creates databases whenever data is first inserted
 * into the database. So in order to properly respond in the hyper way ie.
 * 404 database not found or 409 database already exists, we need to keep track of
 * what databases exist. That is what this class is for
 *
 * For each hyper data store, we will store a document in this "meta" mongo database.
 * We will lazily load and then cache the dbs that exist in the system from the meta database.
 *
 * This will then be used as part of validating whether a hyper data service exists or not.
 */
export class MetaDb {
  private client: MongoInstanceClient
  private metaDbName: string

  private loaded = false
  private dbs = new Map<string, DatabaseMeta>()

  constructor({
    client,
    metaDbName,
  }: {
    client: MongoInstanceClient
    metaDbName: string
  }) {
    this.client = client
    this.metaDbName = metaDbName
  }

  /**
   * load all of the metadata on all hyper data services
   * and cache in a local Map
   *
   * load() will only perform its work once, then set a flag which will cause
   * it to effectively noop on subsequent invocations, instead returning the
   * cached data from the internal Map (see {@link dbs})
   */
  load() {
    /**
     * If already loaded the dbs, then effectively noop
     * returning the cached dbs metadata
     */
    if (this.loaded) {
      return Async.Resolved(Object.fromEntries(this.dbs.entries()))
    }

    return Async.of(
      this.client.db(this.metaDbName).collection<DatabaseMeta>(this.metaDbName),
    )
      .chain(
        Async.fromPromise((collection) => {
          return collection.find({ type: 'database' })
        }),
      )
      .map((res) =>
        res.map((d) => {
          this.dbs.set(d.name, d)
          return d
        })
      )
      .map(tap(() => (this.loaded = true)))
      .map(() => Object.fromEntries(this.dbs.entries()))
  }

  /**
   * return the metadata for the hyper data service identified
   * by the name. Useful to check whether a database exists
   */
  get(name: string) {
    return this.load()
      .chain(() => Async.of(name))
      .chain((name) =>
        name === this.metaDbName
          ? Async.Rejected(
            HyperErr({ status: 422, msg: `${name} is a reserved db name` }),
          )
          : Async.Resolved(name)
      )
      .chain(() => Async.of(this.dbs.get(name)))
      .chain((db) =>
        db ? Async.Resolved(db) : Async.Rejected(
          HyperErr({ status: 404, msg: `database does not exist` }),
        )
      )
  }

  /**
   * Create and store metadata on the hyper data service.
   *
   * If a data service with that name already exists, then
   * this will reject with a HyperErr(409)
   */
  create(name: string) {
    return this.get(name).bichain(
      // Map DNE to creating a db record
      () =>
        Async.of(
          this.client
            .db(this.metaDbName)
            .collection<DatabaseMeta>(this.metaDbName),
        ).chain(
          Async.fromPromise((collection) => {
            const doc = {
              _id: name,
              name,
              type: 'database' as const,
              createdAt: new Date().toISOString(),
            }

            return collection.insertOne(doc).then(() => {
              this.dbs.set(name, doc)
              return doc
            })
          }),
        ),
      // DB was found, so produce a conflict
      () =>
        Async.Rejected(
          HyperErr({ status: 409, msg: 'database already exists' }),
        ),
    )
  }

  /**
   * Remove and delete metadata on the hyper data service.
   *
   * If a data service with that name does not exist, then
   * this will reject with a HyperErr(404)
   */
  remove(name: string) {
    return this.get(name)
      .chain(() =>
        Async.of(
          this.client
            .db(this.metaDbName)
            .collection<DatabaseMeta>(this.metaDbName),
        )
      )
      .chain(Async.fromPromise((collection) => collection.find({ _id: name })))
      .map((docs) => docs.pop())
      .chain((doc) => {
        if (doc) {
          this.dbs.delete(doc.name)
          return Async.Resolved(doc)
        }

        return Async.Rejected(
          HyperErr({ status: 404, msg: 'database does not exist' }),
        )
      })
  }
}
