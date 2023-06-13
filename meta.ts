import { crocks, HyperErr } from './deps.ts'

import type { MongoInstanceClient } from './clients/types.ts'

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
 *
 * This will then be used as part of validating whether a hyper data service exists or not.
 */
export class MetaDb {
  private client: MongoInstanceClient
  private metaDbName: string

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
   * Retrieve the metadata doc for the hyper data service identified
   * by the name. Useful to check whether a database exists
   */
  get(name: string) {
    return Async.of(name)
      .chain((name) =>
        name === this.metaDbName
          ? Async.Rejected(
            HyperErr({ status: 422, msg: `${name} is a reserved db name` }),
          )
          : Async.Resolved(name)
      )
      .chain(() =>
        Async.of(
          this.client
            .db(this.metaDbName)
            .collection<DatabaseMeta>(this.metaDbName),
        )
          .chain(
            Async.fromPromise((collection) => collection.findOne({ _id: name }, {})),
          )
          .chain((doc) =>
            doc ? Async.Resolved(doc) : Async.Rejected(
              HyperErr({ status: 404, msg: `database does not exist` }),
            )
          )
      )
  }

  /**
   * Store metadata doc on the hyper data service.
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

            return collection.insertOne(doc)
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
   * Delete metadata document on the hyper data service.
   *
   * If a data service with that name does not exist, then
   * this will reject with a HyperErr(404)
   */
  remove(name: string) {
    return Async.of(
      this.client.db(this.metaDbName).collection<DatabaseMeta>(this.metaDbName),
    )
      .chain(
        Async.fromPromise((collection) => collection.deleteOne({ _id: name })),
      )
      .chain(({ deletedCount }) => {
        if (deletedCount !== 1) {
          return Async.Rejected(
            HyperErr({ status: 404, msg: 'database does not exist' }),
          )
        }

        return Async.Resolved({ ok: true })
      })
  }
}
