// deno-lint-ignore-file no-unused-vars
import { crocks, R } from "./deps.js";
import { formatDocs, queryOptions } from "./utils.js";

const { Async, tryCatch, resultToAsync } = crocks;
const {
  add,
  always,
  contains,
  equals,
  isEmpty,
  lensPath,
  lensProp,
  map,
  pluck,
  set,
  split,
} = R;
const cmd = (n) => (db) => Async.fromPromise(db[n].bind(db));

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

export function adapter(client) {
  let dbs = []; // add
  client.listDatabases().then((r) => dbs = r);

  // TODO: wrap all mongo commands into asyncs
  const listDatabases = cmd("listDatabases");
  const insertOne = cmd("insertOne");
  const drop = cmd("drop");
  const findOne = cmd("findOne");
  const replaceOne = cmd("replaceOne");
  const removeOne = cmd("deleteOne");

  const checkIfDbExists = (db) =>
    (mdb) =>
      listDatabases(client)()
        .chain((dbs) =>
          contains(db, pluck("name", dbs))
            ? Async.Resolved(mdb)
            : Async.Rejected({
              ok: false,
              status: 400,
              msg: "Database not found!",
            })
        )
        .map(always(mdb));

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  function createDatabase(name) {
    const result = tryCatch((name) => client.database(name).collection(name));

    return resultToAsync(result(name))
      .chain((db) =>
        insertOne(db)({
          _id: "info",
          type: "_ADMIN",
          created: new Date().toISOString(),
        }).map(always(db))
      )
      .chain((db) =>
        removeOne(db)({ _id: "info" })
          .map(always(db))
      )
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
    const db = tryCatch((name) => client.database(name).collection(name));
    return resultToAsync(db(name))
      .chain((db) => drop(db)())
      .bimap(
        (e) => ({ ok: false, msg: e.message }),
        always({ ok: true }),
      )
      .toPromise();
  }

  /**
   * @param {CreateDocumentArgs}
   * @returns {Promise<Response>}
   */
  function createDocument({ db, id, doc }) {
    const getDb = tryCatch((db) => client.database(db).collection(db));

    return resultToAsync(getDb(db))
      .chain(checkIfDbExists(db))
      // if document is empty then return error
      .chain((db) =>
        isEmpty(doc)
          ? Async.Rejected({ ok: false, status: 400, msg: "Document is empty" })
          : Async.Resolved(db)
      )
      .chain((db) =>
        insertOne(db)({
          ...doc,
          _id: id,
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
      .chain((db) =>
        findOne(db)({ _id: id }, {
          noCursorTimeout: undefined,
        })
      )
      .chain((doc) =>
        doc !== undefined
          ? Async.Resolved(doc)
          : Async.Rejected({ ok: false, status: 404, msg: "Not Found!" })
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
        replaceOne(db)({
          _id: id,
        }, doc)
      )
      .bimap(
        (e) => ({ ok: false, msg: e.message }),
        ({ matchedCount, modifiedCount }) => ({
          ok: equals(2, add(matchedCount, modifiedCount)),
          id,
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
        removeOne(db)({
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
      const m = client.database(db).collection(db);
      const docs = await m.find(query.selector, {
        ...queryOptions(query),
        noCursorTimeout: undefined,
      }).toArray();
      return { ok: true, docs };
    } catch (e) {
      console.log(e);
      return { ok: false, msg: e.message };
    }
  }

  /**
   * @param {IndexDocumentArgs}
   * @returns {Promise<Response>}
   */

  async function indexDocuments({ db, name, fields }) {
    try {
      const m = client.database(db).collection(db);

      const key = fields.reduce((acc, field) => ({
        ...acc,
        [field]: 1, // 1 means an ascending index, -1 for descending
      }), {});

      // https://docs.mongodb.com/manual/reference/command/createIndexes/#mongodb-dbcommand-dbcmd.createIndexes
      await m.createIndexes({
        indexes: [
          {
            key,
            name,
          },
        ],
      });

      return { ok: true };
    } catch (e) {
      console.log(e);
      return { ok: false, msg: e.message };
    }
  }

  /**
   * @param {ListDocumentArgs}
   * @returns {Promise<Response>}
   */
  async function listDocuments(
    { db, limit, startkey, endkey, keys, descending },
  ) {
    try {
      let q = {};
      q = startkey ? set(lensPath(["_id", "$gte"]), startkey, q) : q;
      q = endkey ? set(lensPath(["_id", "$lte"]), endkey, q) : q;
      q = keys ? set(lensPath(["_id", "$in"]), split(",", keys), q) : q;

      let options = {};
      options = limit
        ? set(lensProp("limit"), Number(limit), options)
        : options;
      options = descending
        ? set(lensProp("sort"), { _id: -1 }, options)
        : options;

      const m = client.database(db).collection(db);
      const docs = await m.find(q, {
        ...options,
        noCursorTimeout: undefined,
      }).toArray();

      return { ok: true, docs };
    } catch (e) {
      console.log("ERROR: ", e.message);
      return { ok: false, msg: e.message };
    }
  }

  /**
   * @param {BulkDocumentsArgs}
   * @returns {Promise<Response>}
   */
  function bulkDocuments({ db, docs }) {
    const getDb = tryCatch((db) => client.database(db).collection(db));
    return resultToAsync(getDb(db))
      .chain(checkIfDbExists(db))
      .chain((db) =>
        Async.all(
          map((d) => {
            if (d.insert) {
              return insertOne(db)(d.insert.document);
            } else if (d.replaceOne) {
              return replaceOne(db)(
                d.replaceOne.filter,
                d.replaceOne.replacement,
              );
            } else if (d.deleteOne) {
              return removeOne(db)(d.deleteOne.filter);
            }
          }, formatDocs(docs)),
        )
      )
      .bimap(
        (e) => ({ ok: false, msg: e.message }),
        (_) => ({
          ok: true,
          results: map(
            (d) => ({ ok: true, id: d._id }),
            docs,
          ),
        }),
      )
      .toPromise();
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
  });
}
