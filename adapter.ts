import type { MongoInstanceClient } from './clients/types.ts'
import { crocks, HyperErr, R } from './deps.ts'
import {
  handleHyperErr,
  mapSort,
  mongoErrToHyperErr,
  queryOptions,
  toBulkOperations,
} from './utils.ts'
import { MetaDb } from './meta.ts'

const { Async } = crocks
const { always, isEmpty, lensPath, set, split, identity } = R

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
 * @property {object} [partialFilter]
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
      dropDatabase: Async.fromPromise(db.drop.bind(db)),

      // deno-lint-ignore ban-ts-comment
      // @ts-expect-error
      createIndex: Async.fromPromise(col.createIndex.bind(col)),
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
    return meta
      .get(name)
      .bichain(
        // DB DNE, so create it
        () =>
          /**
           * Create metadata doc for db
           */
          meta.create(name).chain((metaDoc) => {
            /**
             * Add a document, then immediately remove it
             * so that the empty database and collection are implcitly created
             */
            return Async.of(
              $database((metaDoc as { name: string }).name),
            ).chain(($db) =>
              $db
                .insertOne({
                  _id: 'info',
                  type: '_ADMIN',
                  created: new Date().toISOString(),
                })
                .chain(() => $db.removeOne({ _id: 'info' }))
                .bimap(
                  mongoErrToHyperErr({
                    subject: `database ${name}`,
                    db: `database ${name}`,
                  }),
                  always({ ok: true }),
                )
            )
          }),
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
      .chain(({ name: actualName }) => $database(actualName).dropDatabase())
      .chain(() => meta.remove(name))
      .bimap(
        mongoErrToHyperErr({
          subject: `database ${name}`,
          db: `database ${name}`,
        }),
        always({ ok: true }),
      )
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
      .chain(({ name: actualName }) =>
        isEmpty(doc)
          ? Async.Rejected(HyperErr({ status: 400, msg: 'document empty' }))
          : Async.of({ ...doc, _id: id }).chain((docWithId) =>
            $database(actualName)
              .insertOne(docWithId)
              .bimap(
                mongoErrToHyperErr({
                  subject: `document with _id ${id}`,
                  db: `database`,
                }),
                always({ ok: true, id: docWithId._id }),
              )
          )
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
      .chain(({ name: actualName }) => $database(actualName).findOne({ _id: id }))
      .chain((doc) =>
        doc ? Async.Resolved(doc) : Async.Rejected(
          HyperErr({
            status: 404,
            msg: `document with _id ${id} does not exist`,
          }),
        )
      )
      .bimap(
        mongoErrToHyperErr({
          subject: `document with _id ${id}`,
          db: `database`,
        }),
        identity,
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
      .chain(({ name: actualName }) =>
        $database(actualName)
          .replaceOne({ _id: id }, doc, { upsert: true })
          .chain(({ matchedCount, modifiedCount }) =>
            matchedCount + modifiedCount === 2 ? Async.Resolved({ ok: true, id }) : Async.Rejected(
              HyperErr({
                status: 404,
                msg: `Could not update document with _id ${id}`,
              }),
            )
          )
          .bimap(
            mongoErrToHyperErr({
              subject: `document with _id ${id}`,
              db: `database`,
            }),
            identity,
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
      .chain(({ name: actualName }) =>
        $database(actualName)
          .removeOne({ _id: id })
          .chain(({ deletedCount }) =>
            deletedCount === 1 ? Async.Resolved({ ok: true, id }) : Async.Rejected(
              HyperErr({
                status: 404,
                msg: `document with _id ${id} does not exist`,
              }),
            )
          )
          .bimap(
            mongoErrToHyperErr({
              subject: `document with _id ${id}`,
              db: `database`,
            }),
            identity,
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
      .chain(({ name: actualName }) =>
        $database(actualName)
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
    partialFilter,
  }: {
    db: string
    name: string
    fields: string[] | { [field: string]: 'ASC' | 'DESC' }[]
    // deno-lint-ignore no-explicit-any
    partialFilter: any
  }) {
    return meta
      .get(db)
      .chain(({ name: actualName }) => {
        return $database(actualName)
          .createIndex(mapSort(fields), {
            name,
            ...(partialFilter ? { partialFilterExpression: partialFilter } : {}),
          })
          .bimap(
            mongoErrToHyperErr({
              subject: `index with fields ${fields.join(', ')}`,
              db: `database`,
            }),
            (res) => {
              console.log(res)
              return always({ ok: true })()
            },
          )
      })
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
    /**
     * TODO: Will an $in perform well? Should examine performance of this
     */
    q = keys ? set(lensPath(['_id', '$in']), split(',', keys), q) : q

    let options = {}
    options = limit ? set(lensPath(['limit']), Number(limit), options) : options
    options = set(
      lensPath(['sort']),
      mapSort([{ _id: descending ? 'DESC' : 'ASC' }]),
      options,
    )

    return meta
      .get(db)
      .chain(({ name: actualName }) =>
        $database(actualName)
          .find(q, { ...options })
          .bimap(
            mongoErrToHyperErr({
              subject: `database`,
              db: `database`,
            }),
            (docs) => ({ ok: true, docs }),
          )
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
    return meta
      .get(db)
      .chain(({ name: actualName }) =>
        $database(actualName)
          .bulk(toBulkOperations(docs))
          .bimap(
            mongoErrToHyperErr({
              subject: `docs with ids ${docs.map((d) => d._id)}`,
              db: `database`,
            }),
            () => ({
              ok: true,
              /**
               * Map response from Mongo to actual ids returned here
               */
              results: docs.map((d) => ({ ok: true, id: d._id })),
            }),
          )
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
