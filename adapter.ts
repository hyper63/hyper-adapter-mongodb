import type { MongoInstanceClient } from './clients/types.ts'
import { crocks, HyperErr, R } from './deps.ts'
import { handleHyperErr, mapSort, queryOptions, toBulkOperations, toHyperErr } from './utils.ts'
import { MetaDb } from './meta.ts'

const { Async } = crocks
const { always, isEmpty, lensPath, set, split } = R

/**
 * @typedef {Object} CreateDocumentArgs
 * @property {string} db
 * @property {string} id
 * @property {object} doc
 *
 * @typedef {Object} RetrieveDocumentArgs
 * @property {string} db
 * @property {string} id
 *
 * @typedef {Object} QueryDocumentsArgs
 * @property {string} db
 * @property {QueryArgs} query
 *
 * @typedef {Object} QueryArgs
 * @property {object} selector
 * @property {string[]} fields
 * @property {number} limit
 * @property {object[]} sort
 * @property {string} use_index
 *
 * @typedef {Object} IndexDocumentArgs
 * @property {string} db
 * @property {string} name
 * @property {string[]} fields
 *
 * @typedef {Object} ListDocumentArgs
 * @property {string} db
 * @property {number} limit
 * @property {string} startkey
 * @property {string} endkey
 * @property {string[]} keys
 *
 * @typedef {Object} BulkDocumentsArgs
 * @property {string} db
 * @property {object[]} docs
 *
 * @typedef {Object} Response
 * @property {boolean} ok
 */
export function adapter({
  client,
  meta,
}: {
  client: MongoInstanceClient
  meta: MetaDb
}) {
  const $database = (name: string) => {
    const db = client.db(name)
    const col = db.collection(name)

    return {
      createIndex: Async.fromPromise(db.createIndex.bind(db)),
      dropDatabase: Async.fromPromise(db.drop.bind(db)),
      insertOne: Async.fromPromise(col.insertOne.bind(col)),
      findOne: Async.fromPromise(col.findOne.bind(col)),
      find: Async.fromPromise(col.find.bind(col)),
      replaceOne: Async.fromPromise(col.replaceOne.bind(col)),
      removeOne: Async.fromPromise(col.deleteOne.bind(col)),
      bulk: Async.fromPromise(col.bulk.bind(col)),
    }
  }

  /**
   * @param {string} name
   */
  function createDatabase(name: string) {
    /**
     * Add a document, then immediately remove it
     * so that the empty database and collection is implcitly created
     */
    return meta
      .get(name)
      .bichain(
        // DB DNE, so create it
        () =>
          Async.of($database(name)).chain(($db) =>
            $db
              .insertOne({
                _id: 'info',
                type: '_ADMIN',
                created: new Date().toISOString(),
              })
              .chain(() => $db.removeOne({ _id: 'info' }))
              /**
               * Make sure to persist metadata on the db
               */
              .chain(() => meta.create(name))
              .map(always({ ok: true }))
          ),
        // Already exists, so return a HyperErr(409)
        () =>
          Async.Rejected(
            HyperErr({ status: 409, msg: 'database already exists' }),
          ),
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {string} name
   */
  function removeDatabase(name: string) {
    return meta
      .get(name)
      .chain(() => $database(name).dropDatabase())
      .chain(() => meta.remove(name))
      .map(always({ ok: true }))
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {CreateDocumentArgs}
   */
  function createDocument({
    db,
    id,
    doc,
  }: {
    db: string
    id: string
    doc: Record<string, unknown>
  }) {
    return meta
      .get(db)
      .chain(() =>
        isEmpty(doc)
          ? Async.Rejected(HyperErr({ status: 400, msg: 'document empty' }))
          : $database(db)
            .insertOne({ ...doc, _id: id })
            .bimap(toHyperErr, always({ ok: true, id }))
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {RetrieveDocumentArgs}
   */
  function retrieveDocument({ db, id }: { db: string; id: string }) {
    return meta
      .get(db)
      .chain(() => $database(db).findOne({ _id: id }))
      .chain((doc) =>
        doc !== undefined
          ? Async.Resolved(doc)
          : Async.Rejected({ ok: false, status: 404, msg: 'Not Found!' })
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {CreateDocumentArgs}
   * @returns {Promise<Response>}
   */
  function updateDocument({
    db,
    id,
    doc,
  }: {
    db: string
    id: string
    doc: Record<string, unknown>
  }) {
    return meta
      .get(db)
      .chain(() =>
        $database(db)
          .replaceOne({ _id: id }, doc)
          .bimap(
            /**
             * TODO: properly map based on server response
             */
            toHyperErr,
            ({ matchedCount, modifiedCount }) => ({
              ok: matchedCount + modifiedCount === 2,
              id,
            }),
          )
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {RetrieveDocumentArgs}
   */
  function removeDocument({ db, id }: { db: string; id: string }) {
    return meta
      .get(db)
      .chain(() =>
        $database(db)
          .removeOne({ _id: id })
          .bimap(
            /**
             * TODO: properly map based on server response
             */
            // deno-lint-ignore no-explicit-any
            (e: any) => HyperErr({ status: 400, msg: e.message }),
            (_) => ({ ok: true, id }),
          )
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {QueryDocumentsArgs}
   */
  // deno-lint-ignore no-explicit-any
  function queryDocuments({ db, query }: { db: string; query: any }) {
    return meta
      .get(db)
      .chain(() =>
        $database(db)
          .find(query.selector, {
            ...queryOptions(query),
          })
          .map((docs) => ({ ok: true, docs }))
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {IndexDocumentArgs}
   */
  function indexDocuments({
    db,
    name,
    fields,
  }: {
    db: string
    name: string
    fields: string[] | { [field: string]: 'ASC' | 'DESC' }[]
  }) {
    meta
      .get(db)
      .chain(() =>
        $database(db)
          .createIndex({ name, spec: mapSort(fields) })
          .bimap(toHyperErr, always({ ok: true }))
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {ListDocumentArgs}
   */
  function listDocuments({
    db,
    limit,
    startkey,
    endkey,
    keys,
    descending,
  }: {
    db: string
    limit?: number
    startkey?: string
    endkey?: string
    keys?: string
    descending?: boolean
  }) {
    let q = {}
    q = startkey ? set(lensPath(['_id', '$gte']), startkey, q) : q
    q = endkey ? set(lensPath(['_id', '$lte']), endkey, q) : q
    q = keys ? set(lensPath(['_id', '$in']), split(',', keys), q) : q

    let options = {}
    options = limit ? set(lensPath(['limit']), Number(limit), options) : options
    options = descending ? set(lensPath(['sort']), mapSort([{ _id: 'DESC' }]), options) : options

    return meta
      .get(db)
      .chain(() =>
        $database(db)
          .find(q, { ...options })
          .map((docs) => ({ ok: true, docs }))
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  /**
   * @param {BulkDocumentsArgs}
   */
  function bulkDocuments({
    db,
    docs,
  }: {
    db: string
    docs: Record<string, unknown>[]
  }) {
    meta
      .get(db)
      .chain(() =>
        $database(db)
          .bulk(toBulkOperations(docs))
          .bimap(toHyperErr, () => ({
            ok: true,
            /**
             * Map response from Mongo to actual ids returned here
             */
            results: docs.map((d) => ({ ok: true, id: d._id })),
          }))
      )
      .bichain(handleHyperErr, Async.Resolved)
      .toPromise()
  }

  return Object.freeze({
    createDatabase,
    removeDatabase,
    createDocument,
    retrieveDocument,
    updateDocument,
    removeDocument,
    queryDocuments,
    indexDocuments,
    listDocuments,
    bulkDocuments,
  })
}