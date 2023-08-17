import { HyperErr } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-utils%40v0.1.0/packages/utils/hyper-err.js'
import { isHyperErr } from './deps.ts'
import { assert, assertEquals, assertObjectMatch } from './dev_deps.ts'

import { mapSort, mongoErrToHyperErr, queryOptions, toBulkOperations } from './utils.ts'

Deno.test('utils', async (t) => {
  await t.step('toBulkOperations', async (t) => {
    const bulk = [
      { _id: '1234', _deleted: true },
      { _id: '4567', foo: 'bar' },
      { _id: 'dsfasdf', _deleted: true },
      { _id: '1111', fizz: 'buzz', _update: true },
    ]

    await t.step('should map deleted docs to deleteOne operation', () => {
      const [d1, /* */, d2] = toBulkOperations(bulk)

      assertEquals(d1, { deleteOne: { filter: { _id: '1234' } } })
      assertEquals(d2, { deleteOne: { filter: { _id: 'dsfasdf' } } })
    })

    await t.step(
      'should map upserts to replaceOne operation with upsert flag',
      () => {
        const [, /* */ create1, /* */, update2] = toBulkOperations(bulk)

        assertEquals(create1, {
          replaceOne: {
            filter: { _id: '4567' },
            replacement: { _id: '4567', foo: 'bar' },
            upsert: true,
          },
        })
        assertEquals(update2, {
          replaceOne: {
            filter: { _id: '1111' },
            replacement: { _id: '1111', fizz: 'buzz' },
            upsert: true,
          },
        })
      },
    )
  })

  await t.step('queryOptions', async (t) => {
    await t.step('should map the limit', () => {
      const res = queryOptions({ limit: '123' })
      assertEquals(res, { limit: 123 })
    })

    await t.step('should default the limit to 25', () => {
      const res = queryOptions({})
      assertEquals(res, { limit: 25 })
    })

    await t.step('should map fields to projection', () => {
      const res = queryOptions({ fields: ['_id', 'foo', 'bar'] })
      assertObjectMatch(res, { projection: { foo: 1, bar: 1, _id: 1 } })
    })

    await t.step('should disclude _id in projection by default', () => {
      const res = queryOptions({ fields: ['foo', 'bar'] })
      assertObjectMatch(res, { projection: { foo: 1, bar: 1, _id: 0 } })
    })

    await t.step('should map hyper sort to mongo sort', () => {
      const res = queryOptions({ sort: ['_id', 'bar'] })
      assertObjectMatch(res, { sort: { _id: 1, bar: 1 } })
    })
  })

  await t.step('mapSort', async (t) => {
    await t.step('should map hyper string sort to mongo sort', () => {
      const res = mapSort(['foo', 'bar'])
      assertEquals(res, { foo: 1, bar: 1 })
    })

    await t.step('should map hyper object sort to mongo sort', () => {
      const res = mapSort([{ foo: 'ASC' }, { bar: 'DESC' }])
      assertEquals(res, { foo: 1, bar: -1 })
    })
  })

  await t.step('mongoErrToHyperErr', async (t) => {
    await t.step('should return the HyperErr provided', () => {
      assert(
        isHyperErr(
          mongoErrToHyperErr({ subject: 'document with _id foobar' })(
            HyperErr({ status: 404, msg: 'oops' }),
          ),
        ),
      )
    })

    await t.step('should map the MongoDB error based on code', async (t) => {
      await t.step('conflict', () => {
        assertObjectMatch(
          mongoErrToHyperErr({ subject: 'document with _id foobar' })({
            code: 11000,
            message: 'mongo error',
          }),
          { status: 409, msg: 'document with _id foobar already exists' },
        )
      })

      await t.step('index conflict', () => {
        assertObjectMatch(
          mongoErrToHyperErr({ subject: 'index foobar' })({
            code: 86,
            message: 'mongo error',
          }),
          {
            status: 409,
            msg: 'index foobar fields do not match the existing index with the same name',
          },
        )
      })

      await t.step(
        'should default to a status and the Error message from MongoDB driver',
        () => {
          assertObjectMatch(
            mongoErrToHyperErr({ subject: 'index foobar' })({
              code: 12345,
              message: 'mongo error',
            }),
            { status: 500, msg: 'mongo error' },
          )

          assertObjectMatch(
            mongoErrToHyperErr({ subject: 'index foobar' })({
              code: 12345,
              status: 503,
              message: 'use mongo status',
            }),
            { status: 503, msg: 'use mongo status' },
          )

          assertObjectMatch(
            mongoErrToHyperErr({ subject: 'index foobar' })({
              code: 12345,
              no_message: 'use mongo status',
            }),
            { status: 500, msg: 'an error occurred' },
          )
        },
      )
    })
  })
})
