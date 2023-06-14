import { assertEquals, assertObjectMatch, assertThrows, deferred } from '../dev_deps.ts'

import { AtlasDataClient } from './atlas-data.ts'

Deno.test('client - atlas-data', async (t) => {
  let fetchMock = deferred<{ url: string; init: RequestInit }>()

  const happy = {
    endpoint: 'https://data.mongodb-api.com/app/foo/endpoint/data/v1',
    dataSource: 'foobar',
    auth: {
      apiKey: 'secret',
    },
    fetch: ((url: string, init: RequestInit) => {
      fetchMock.resolve({ url, init })
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      })
    }) as typeof fetch,
  }

  await t.step('should append the method to the url', async () => {
    const client = new AtlasDataClient(happy)
    fetchMock = deferred<{ url: string; init: RequestInit }>()

    await client
      .db('db')
      .collection('default')
      .findOne({ foo: 'bar' })
      .then(async () => {
        const { url } = await fetchMock
        assertEquals(
          url,
          'https://data.mongodb-api.com/app/foo/endpoint/data/v1/action/findOne',
        )
      })
  })

  await t.step('should append the headers to the request', async (t) => {
    await t.step('Content-Type and Accept', async () => {
      const client = new AtlasDataClient(happy)
      fetchMock = deferred<{ url: string; init: RequestInit }>()

      await client
        .db('db')
        .collection('default')
        .findOne({ foo: 'bar' })
        .then(async () => {
          const { init } = await fetchMock
          const headers = init.headers as Headers
          assertEquals(headers.get('Content-Type'), 'application/ejson')
          assertEquals(headers.get('Accept'), 'application/ejson')
        })
    })

    await t.step('auth', async (t) => {
      await t.step('api-key', async () => {
        const client = new AtlasDataClient(happy)
        fetchMock = deferred<{ url: string; init: RequestInit }>()

        await client
          .db('db')
          .collection('default')
          .findOne({ foo: 'bar' })
          .then(async () => {
            const { init } = await fetchMock
            const headers = init.headers as Headers
            assertEquals(headers.get('api-key'), 'secret')
          })
      })

      await t.step('jwtTokenString', async () => {
        const client = new AtlasDataClient({
          ...happy,
          auth: { jwtTokenString: 'foobar' },
        })
        fetchMock = deferred<{ url: string; init: RequestInit }>()

        await client
          .db('db')
          .collection('default')
          .findOne({ foo: 'bar' })
          .then(async () => {
            const { init } = await fetchMock
            const headers = init.headers as Headers
            assertEquals(headers.get('jwtTokenString'), 'foobar')
          })
      })

      await t.step('email and password', async () => {
        const client = new AtlasDataClient({
          ...happy,
          auth: { email: 'foo@bar.com', password: 'secret' },
        })
        fetchMock = deferred<{ url: string; init: RequestInit }>()

        await client
          .db('db')
          .collection('default')
          .findOne({ foo: 'bar' })
          .then(async () => {
            const { init } = await fetchMock
            const headers = init.headers as Headers
            assertEquals(headers.get('email'), 'foo@bar.com')
            assertEquals(headers.get('password'), 'secret')
          })
      })
    })
  })

  await t.step('should append the body to the request', async (t) => {
    await t.step('database, collection, and dataSource', async () => {
      const client = new AtlasDataClient(happy)
      fetchMock = deferred<{ url: string; init: RequestInit }>()

      await client
        .db('db')
        .collection('default')
        .findOne({ foo: 'bar' }, { projection: { foo: 1, _id: 0 } })
        .then(async () => {
          const { url, init } = await fetchMock
          assertObjectMatch(await new Request(url, init).json(), {
            database: 'db',
            collection: 'default',
            dataSource: 'foobar',
          })
        })
    })

    await t.step('options', async () => {
      const client = new AtlasDataClient(happy)
      fetchMock = deferred<{ url: string; init: RequestInit }>()

      await client
        .db('db')
        .collection('default')
        .findOne({ foo: 'bar' }, { projection: { foo: 1, _id: 0 } })
        .then(async () => {
          const { url, init } = await fetchMock
          assertObjectMatch(await new Request(url, init).json(), {
            filter: { foo: 'bar' },
            projection: { foo: 1, _id: 0 },
          })
        })
    })
  })

  await t.step('should throw if credentials are not provided', () => {
    // deno-lint-ignore ban-ts-comment
    // @ts-expect-error
    assertThrows(() => new AtlasDataClient({ ...happy, auth: {} }))
  })
})
