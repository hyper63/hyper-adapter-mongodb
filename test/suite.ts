// deno-lint-ignore-file no-explicit-any
import { assert, assertObjectMatch } from '../dev_deps.ts'

import { adapter } from '../adapter.ts'
import { MongoInstanceClient } from '../clients/types.ts'
import { MetaDb } from '../meta.ts'

export const suite = (t: Deno.TestContext, DB = 'hyper-movies') =>
async (
  client: MongoInstanceClient,
  options: { shouldBaseLine: boolean } = { shouldBaseLine: false },
) => {
  const a = adapter({
    client,
    meta: new MetaDb({ client, metaDbName: 'foobar' }),
  })

  /**
   * We may need to baseline our test suite by deleting the database under
   * test. This step does just that, idempotently
   */
  await t.step('baseline', async () => {
    if (!options.shouldBaseLine) return assert(true)

    const res = await a.removeDatabase(DB).then((res: any) => {
      /**
       * Database does not exist, so nothing to baseline
       */
      if (res.status === 404) return { ok: true }
      return res
    })

    assert((res as any).ok)
  })

  await t.step('createDatabase', async (t) => {
    await t.step('should create the database', async () => {
      const res = await a.createDatabase(DB)
      assertObjectMatch(res as any, { ok: true })

      await a.removeDatabase(DB)
    })

    await t.step(
      'should return a HyperErr(409) if database already exists',
      async () => {
        await a.createDatabase(DB)

        const res = await a.createDatabase(DB)
        assertObjectMatch(res as any, { ok: false, status: 409 })

        await a.removeDatabase(DB)
      },
    )
  })

  await t.step('removeDatabase', async (t) => {
    await t.step('should remove the database', async () => {
      await a.createDatabase(DB)

      const res = await a.removeDatabase(DB)
      assertObjectMatch(res as any, { ok: true })
    })

    await t.step(
      'should return a HyperErr(404) if database already exists',
      async () => {
        const res = await a.removeDatabase(DB)
        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('createDocument', async (t) => {
    await t.step(
      'should create the document, assigning the provided _id',
      async () => {
        await a.createDatabase(DB)

        const res = await a.createDocument({
          db: DB,
          id: 'foobar',
          doc: { foo: 'bar' },
        })

        assertObjectMatch(res as any, { ok: true, id: 'foobar' })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return a HyperErr(400) if the document is empty',
      async () => {
        await a.createDatabase(DB)

        const res = await a.createDocument({
          db: DB,
          id: 'foobar',
          doc: {},
        })

        assertObjectMatch(res as any, { ok: false, status: 400 })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return a HyperErr(409) if the _id already exists',
      async () => {
        const id = 'foobar'
        await a.createDatabase(DB)

        await a.createDocument({
          db: DB,
          id,
          doc: { foo: 'bar' },
        })

        // dup
        const res = await a.createDocument({
          db: DB,
          id,
          doc: { foo: 'bar' },
        })

        assertObjectMatch(res as any, { ok: false, status: 409 })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.createDocument({
          db: DB,
          id: 'foobar',
          doc: { foo: 'bar' },
        })

        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('retrieveDocument', async (t) => {
    await t.step('should retrieve the document', async () => {
      await a.createDatabase(DB)

      await a.createDocument({
        db: DB,
        id: 'foobar',
        doc: { foo: 'bar' },
      })

      const res = await a.retrieveDocument({ db: DB, id: 'foobar' })

      assertObjectMatch(res as any, { _id: 'foobar', foo: 'bar' })

      await a.removeDatabase(DB)
    })

    await t.step(
      'should return a HyperErr(404) if the document is not found',
      async () => {
        await a.createDatabase(DB)

        const res = await a.retrieveDocument({ db: DB, id: 'foobar' })
        assertObjectMatch(res as any, { ok: false, status: 404 })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.retrieveDocument({ db: DB, id: 'foobar' })
        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('updateDocument', async (t) => {
    await t.step('should replace the document', async () => {
      await a.createDatabase(DB)

      await a.createDocument({
        db: DB,
        id: 'foobar',
        doc: { foo: 'bar' },
      })

      await a.updateDocument({
        db: DB,
        id: 'foobar',
        doc: { fizz: 'buzz' },
      })

      const res = await a.retrieveDocument({ db: DB, id: 'foobar' })
      assertObjectMatch(res as any, { _id: 'foobar', fizz: 'buzz' })

      await a.removeDatabase(DB)
    })

    await t.step('should upsert if the document is not found', async () => {
      await a.createDatabase(DB)

      // no createDocument

      await a.updateDocument({
        db: DB,
        id: 'foobar',
        doc: { fizz: 'buzz' },
      })

      const res = await a.retrieveDocument({ db: DB, id: 'foobar' })
      assertObjectMatch(res as any, { _id: 'foobar', fizz: 'buzz' })

      await a.removeDatabase(DB)
    })

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.updateDocument({
          db: DB,
          id: 'foobar',
          doc: { fizz: 'buzz' },
        })
        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('removeDocument', async (t) => {
    await t.step('should remove the document', async () => {
      await a.createDatabase(DB)

      await a.createDocument({
        db: DB,
        id: 'foobar',
        doc: { foo: 'bar' },
      })

      const res = await a.removeDocument({ db: DB, id: 'foobar' })
      assertObjectMatch(res as any, { ok: true, id: 'foobar' })

      await a.removeDatabase(DB)
    })

    await t.step(
      'should return a HyperErr(404) if the document is not found',
      async () => {
        await a.createDatabase(DB)

        const res = await a.removeDocument({ db: DB, id: 'foobar' })
        assertObjectMatch(res as any, { ok: false, status: 404 })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.removeDocument({ db: DB, id: 'foobar' })
        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('queryDocuments', async (t) => {
    await t.step(
      'should return the documents that match the selector',
      async () => {
        await a.createDatabase(DB)

        await a.createDocument({
          db: DB,
          id: '10-caddyshack',
          doc: { title: 'Caddyshack', year: '1978', genre: ['comedy'] },
        })

        await a.createDocument({
          db: DB,
          id: '12-ghostbusters',
          doc: { title: 'Ghostbusters', year: '1980', genre: ['comedy'] },
        })

        await a.createDocument({
          db: DB,
          id: '15-starwars',
          doc: { title: 'Star Wars', year: '1976', genre: ['sci-fi'] },
        })

        await a.createDocument({
          db: DB,
          id: '17-jaws',
          doc: { title: 'Jaws', year: '1977', genre: ['drama'] },
        })

        const res = await a.queryDocuments({
          db: DB,
          query: {
            selector: { year: { $lte: '1978' } },
            fields: ['_id', 'genre', 'year'],
            sort: [{ title: 'DESC' }, { year: 'DESC' }],
          },
        })

        assertObjectMatch(res as any, {
          ok: true,
          docs: [
            { _id: '15-starwars', year: '1976', genre: ['sci-fi'] },
            { _id: '17-jaws', year: '1977', genre: ['drama'] },
            { _id: '10-caddyshack', year: '1978', genre: ['comedy'] },
          ],
        })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return an empty array if no documents are found',
      async () => {
        await a.createDatabase(DB)

        await a.createDocument({
          db: DB,
          id: '10-caddyshack',
          doc: { title: 'Caddyshack', year: '1978', genre: ['comedy'] },
        })

        await a.createDocument({
          db: DB,
          id: '12-ghostbusters',
          doc: { title: 'Ghostbusters', year: '1980', genre: ['comedy'] },
        })

        await a.createDocument({
          db: DB,
          id: '15-starwars',
          doc: { title: 'Star Wars', year: '1976', genre: ['sci-fi'] },
        })

        await a.createDocument({
          db: DB,
          id: '17-jaws',
          doc: { title: 'Jaws', year: '1977', genre: ['drama'] },
        })

        const res = await a.queryDocuments({
          db: DB,
          query: {
            selector: { year: { $lte: '1960' } },
            fields: ['_id', 'genre', 'year'],
            sort: [{ title: 'DESC' }, { year: 'DESC' }],
          },
        })

        assertObjectMatch(res as any, {
          ok: true,
          docs: [],
        })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.queryDocuments({
          db: DB,
          query: {
            selector: { year: { $lte: '1960' } },
            fields: ['_id', 'genre', 'year'],
            sort: [{ title: 'DESC' }, { year: 'DESC' }],
          },
        })

        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('indexDocuments', async (t) => {
    await t.step('should create the index', async () => {
      await a.createDatabase(DB)

      await a.createDocument({
        db: DB,
        id: '10-caddyshack',
        doc: { title: 'Caddyshack', year: '1978', genre: ['comedy'] },
      })

      await a.createDocument({
        db: DB,
        id: '12-ghostbusters',
        doc: { title: 'Ghostbusters', year: '1980', genre: ['comedy'] },
      })

      const res = await a.indexDocuments({
        db: DB,
        name: 'idx-title-year',
        fields: ['title', 'year'],
      })

      assertObjectMatch(res as any, { ok: true })

      await a.removeDatabase(DB)
    })

    await t.step('should create the index with obj fields', async () => {
      await a.createDatabase(DB)

      await a.createDocument({
        db: DB,
        id: '10-caddyshack',
        doc: { title: 'Caddyshack', year: '1978', genre: ['comedy'] },
      })

      await a.createDocument({
        db: DB,
        id: '12-ghostbusters',
        doc: { title: 'Ghostbusters', year: '1980', genre: ['comedy'] },
      })

      const res = await a.indexDocuments({
        db: DB,
        name: 'idx-title-year',
        fields: [{ title: 'DESC' }, { year: 'ASC' }],
      })

      assertObjectMatch(res as any, { ok: true })

      await a.removeDatabase(DB)
    })

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.indexDocuments({
          db: DB,
          name: 'idx-title-year',
          fields: [{ title: 'DESC' }, { year: 'ASC' }],
        })

        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('listDocuments', async (t) => {
    await t.step('should return the list of documents', async () => {
      await a.createDatabase(DB)

      await a.createDocument({
        db: DB,
        id: '15-starwars',
        doc: { title: 'Star Wars', year: '1976', genre: ['sci-fi'] },
      })

      await a.createDocument({
        db: DB,
        id: '20-caddyshack',
        doc: { title: 'Caddyshack', year: '1978', genre: ['comedy'] },
      })

      await a.createDocument({
        db: DB,
        id: '22-ghostbusters',
        doc: { title: 'Ghostbusters', year: '1980', genre: ['comedy'] },
      })

      await a.createDocument({
        db: DB,
        id: '17-jaws',
        doc: { title: 'Jaws', year: '1977', genre: ['drama'] },
      })

      const res = await a.listDocuments({
        db: DB,
        limit: 2,
        startkey: '16',
      })

      assertObjectMatch(res as any, {
        ok: true,
        docs: [
          { _id: '17-jaws', title: 'Jaws', year: '1977', genre: ['drama'] },
          {
            _id: '20-caddyshack',
            title: 'Caddyshack',
            year: '1978',
            genre: ['comedy'],
          },
        ],
      })

      await a.removeDatabase(DB)
    })

    await t.step(
      'should return the documents whose _id is in the keys provided',
      async () => {
        await a.createDatabase(DB)

        await a.createDocument({
          db: DB,
          id: '15-starwars',
          doc: { title: 'Star Wars', year: '1976', genre: ['sci-fi'] },
        })

        await a.createDocument({
          db: DB,
          id: '20-caddyshack',
          doc: { title: 'Caddyshack', year: '1978', genre: ['comedy'] },
        })

        await a.createDocument({
          db: DB,
          id: '22-ghostbusters',
          doc: { title: 'Ghostbusters', year: '1980', genre: ['comedy'] },
        })

        await a.createDocument({
          db: DB,
          id: '17-jaws',
          doc: { title: 'Jaws', year: '1977', genre: ['drama'] },
        })

        const res = await a.listDocuments({
          db: DB,
          keys: '22-ghostbusters,17-jaws,20-caddyshack',
        })

        assertObjectMatch(res as any, {
          ok: true,
          docs: [
            { _id: '17-jaws', title: 'Jaws', year: '1977', genre: ['drama'] },
            {
              _id: '20-caddyshack',
              title: 'Caddyshack',
              year: '1978',
              genre: ['comedy'],
            },
            {
              _id: '22-ghostbusters',
              title: 'Ghostbusters',
              year: '1980',
              genre: ['comedy'],
            },
          ],
        })

        await a.removeDatabase(DB)
      },
    )

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.listDocuments({
          db: DB,
          keys: '22-ghostbusters,17-jaws,20-caddyshack',
        })
        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })

  await t.step('bulkDocuments', async (t) => {
    await t.step('should perform the bulk operation', async () => {
      await a.createDatabase(DB)

      await a.createDocument({
        db: DB,
        id: '15-starwars',
        doc: { title: 'Star Wars', year: '1976', genre: ['sci-fi'] },
      })

      await a.createDocument({
        db: DB,
        id: '20-caddyshack',
        doc: { title: 'Caddyshack', year: '1978', genre: ['comedy'] },
      })

      const res = await a.bulkDocuments({
        db: DB,
        docs: [
          // insert
          { _id: '17-jaws', title: 'Jaws', year: '1977', genre: ['drama'] },
          // delete
          { _id: '15-starwars', _deleted: true },
          // update
          {
            _id: '20-caddyshack',
            title: 'Caddyshack Woo',
            year: '1978',
            genre: ['comedy'],
            foo: 'bar',
          },
        ],
      })

      assertObjectMatch(res as any, {
        ok: true,
        results: [
          { id: '17-jaws', ok: true },
          { id: '15-starwars', ok: true },
          { id: '20-caddyshack', ok: true },
        ],
      })

      const queryRes = await a.queryDocuments({
        db: DB,
        query: { sort: [{ _id: 'ASC' }] },
      })
      assertObjectMatch(queryRes as any, {
        ok: true,
        docs: [
          { _id: '17-jaws', title: 'Jaws', year: '1977', genre: ['drama'] },
          {
            _id: '20-caddyshack',
            title: 'Caddyshack Woo',
            year: '1978',
            genre: ['comedy'],
            foo: 'bar',
          },
        ],
      })

      await a.removeDatabase(DB)
    })

    await t.step(
      'should return a HyperErr(404) if the database does not exist',
      async () => {
        const res = await a.bulkDocuments({
          db: DB,
          docs: [{ _id: 'foo' }],
        })
        assertObjectMatch(res as any, { ok: false, status: 404 })
      },
    )
  })
}
