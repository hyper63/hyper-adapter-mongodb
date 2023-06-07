// deno-lint-ignore-file ban-ts-comment
import { assert } from '../dev_deps.ts'

import { adapter } from '../adapter.ts'
import { MongoInstanceClient } from '../clients/types.ts'
import { MetaDb } from '../meta.ts'

export const suite = (
  client: MongoInstanceClient,
  options: { shouldBaseLine: boolean } = { shouldBaseLine: false },
) => {
  Deno.test(`Mongo Adapter Test Suite - '${client.constructor.name}'`, async (t) => {
    const a = adapter({ client, meta: new MetaDb({ client, metaDbName: 'foobar' }) })

    await t.step('baseline', async () => {
      if (!options.shouldBaseLine) return assert(true)
      const res = await a.removeDatabase('hyper~movies').catch((e) => {
        if (e.status === 404) return { ok: true }
        throw e
      })
      // @ts-expect-error
      assert(res.ok)
    })

    await t.step('createDatabase', async (t) => {
      await t.step('should create the database', async () => {
      })

      await t.step('should return a HyperErr(409) if database already exists', async () => {
      })
    })

    await t.step('removeDatabase', async (t) => {
      await t.step('should remove the database', async () => {
      })

      await t.step('should return a HyperErr(404) if database already exists', async () => {
      })
    })

    await t.step('createDocument', async (t) => {
      await t.step('should create the document, assigning the provided _id', async () => {
      })

      await t.step('should return a HyperErr(400) if the document is empty', async () => {
      })

      await t.step('should return a HyperErr(409) if the _id already exists', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })

    await t.step('retrieveDocument', async (t) => {
      await t.step('should retrieve the document', async () => {
      })

      await t.step('should return a HyperErr(404) if the document is not found', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })

    await t.step('updateDocument', async (t) => {
      await t.step('should update the document', async () => {
      })

      await t.step('should return a HyperErr(404) if the document is not found', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })

    await t.step('removeDocument', async (t) => {
      await t.step('should remove the document', async () => {
      })

      await t.step('should return a HyperErr(404) if the document is not found', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })

    await t.step('queryDocuments', async (t) => {
      await t.step('should return the documents that match the selector', async () => {
      })

      await t.step('should return an empty array if no documents are found', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })

    await t.step('indexDocuments', async (t) => {
      await t.step('should create the index', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })

    await t.step('listDocuments', async (t) => {
      await t.step('should return the list of documents', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })

    await t.step('bulkDocuments', async (t) => {
      await t.step('should perform the bulk operation', async () => {
      })

      await t.step('should return a HyperErr(404) if the database does not exist', async () => {
      })
    })
  })
}
