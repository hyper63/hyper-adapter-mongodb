// deno-lint-ignore-file no-unused-vars
import { crocks, R } from "./deps.js";

const { Async, tryCatch, resultToAsync } = crocks;
const { add, always, assoc, contains, equals, pluck } = R;
const cmd = n => db => Async.fromPromise(db[n].bind(db))

/**
 *
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

export function adapter(client) {
  let dbs = [] // add 
  client.listDatabases().then(r => dbs = r)

  // TODO: wrap all mongo commands into asyncs
  const listDatabases = cmd('listDatabases')
  const insertOne = cmd('insertOne')
  const drop = cmd('drop')

  const checkIfDbExists = db => mdb => listDatabases(client)()
    .chain(dbs => contains(db, pluck('name', dbs)) ? Async.Resolved(mdb) : Async.Rejected({ ok: false, status: 400, msg: 'Database not found!' }))
    .map(always(mdb))

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  function createDatabase(name) {
    const result = tryCatch((name) =>
      client.database(name).collection(name)
    );

    return resultToAsync(result(name))
      .chain(db => insertOne(db)({ _id: 'info', type: '_ADMIN', created: new Date().toISOString() }))
      .bimap(
        (e) => ({ ok: false, msg: e.message }),
        () => ({ ok: true }),
      )
      .toPromise();
  }

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  function removeDatabase(name) {
    const db = tryCatch((name) =>
      client.database(name).collection(name)
    )
    return resultToAsync(db(name))
      .chain(db => drop(db)())
      .bimap(
        e => ({ ok: false, msg: e.message }),
        always({ ok: true })
      )
      .toPromise()
  }

  /**
   * @param {CreateDocumentArgs}
   * @returns {Promise<Response>}
   */
  function createDocument({ db, id, doc }) {
    const getDb = tryCatch((db) => client.database(db).collection(db));

    return resultToAsync(getDb(db))
      .chain(checkIfDbExists(db))
      .chain((db) =>
        insertOne(db)({
          _id: id,
          ...doc,
        })
          .bimap(
            (e) => ({ ok: false, status: 409, id, msg: e.message }),
            (id) => ({ ok: true, id }),
          )
      )
      .toPromise();
  }

  /**
   * @param {RetrieveDocumentArgs}
   * @returns {Promise<Response>}
   */
  function retrieveDocument({ db, id }) {
    const getDb = tryCatch((db) => client.database(db).collection(db));
    return resultToAsync(getDb(db))
      .chain(checkIfDbExists(db))
      .chain((db) => Async.fromPromise(db.findOne.bind(db))({ _id: id }))
      //.map(v => (console.log('result', v), v))
      .bimap(
        (e) => ({ ok: false, msg: e.message }),
        (doc) => doc,
      )
      .toPromise();
  }

  /**
   * @param {CreateDocumentArgs}
   * @returns {Promise<Response>}
   */
  function updateDocument({ db, id, doc }) {
    const getDb = tryCatch((db) => client.database(db).collection(db));
    return resultToAsync(getDb(db))
      .chain(checkIfDbExists(db))
      .chain((db) =>
        Async.fromPromise(db.updateOne.bind(db))({
          _id: id,
        }, { $set: doc })
      )
      .bimap(
        (e) => ({ ok: false, msg: e.message }),
        ({ matchedCount, modifiedCount }) => ({
          ok: equals(2, add(matchedCount, modifiedCount)),
        }),
      )
      .toPromise();
  }

  /**
   * @param {RetrieveDocumentArgs}
   * @returns {Promise<Response>}
   */
  function removeDocument({ db, id }) {
    const getDb = tryCatch((db) => client.database(db).collection(db));
    return resultToAsync(getDb(db))
      .chain(checkIfDbExists(db))
      .chain((db) =>
        Async.fromPromise(db.delete.bind(db))({
          _id: id,
        })
      )
      .bimap(
        (e) => ({ ok: false, msg: e.message }),
        (_) => ({ ok: true, id, msg: _ }),
      )
      .toPromise();
  }

  /**
   * @param {QueryDocumentsArgs}
   * @returns {Promise<Response>}
   */
  async function queryDocuments({ db, query }) {
    try {
      let options = {};
      options = query.limit ? assoc("limit", query.limit, options) : options;

      const m = client.database(db).collection(db);
      const docs = await m.find(query.selector, options).toArray();

      return { ok: true, docs };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  /**
   *
   * @param {IndexDocumentArgs}
   * @returns {Promise<Response>}
   */

  async function indexDocuments({ db, name, fields }) { }

  /**
   *
   * @param {ListDocumentArgs}
   * @returns {Promise<Response>}
   */
  async function listDocuments(
    { db, limit, startkey, endkey, keys, descending },
  ) {
    try {
      let q = {};
      q = startkey ? assoc("_id", { $gte: startkey }, q) : q;
      q = endkey ? assoc("_id", { $lte: endkey }, q) : q;
      q = keys ? assoc("_id", { $in: keys }, q) : q;

      let options = {};
      options = limit ? assoc("limit", limit, options) : options;
      options = descending ? assoc("sort", [["_id", 1]], options) : options;

      const m = client.database(db).collection(db);
      const docs = await m.find(q, options).toArray();

      return { ok: true, docs };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  /**
   *
   * @param {BulkDocumentsArgs}
   * @returns {Promise<Response>}
   */
  async function bulkDocuments({ db, docs }) { }

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
  });
}
