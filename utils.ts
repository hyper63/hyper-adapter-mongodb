import { crocks, HyperErr, isHyperErr, R } from './deps.ts'

const { map, omit, ifElse } = R
const { Async } = crocks

export const handleHyperErr = ifElse(
  isHyperErr,
  Async.Resolved,
  Async.Rejected,
)

export const toBulkOperations = map(
  (d: Record<string, unknown> & { _deleted?: boolean; _update?: boolean }) => {
    if (d._deleted) {
      return { deleteOne: { filter: { _id: d._id } } }
    } else {
      return {
        replaceOne: {
          filter: { _id: d._id },
          replacement: omit(['_update'], d),
          upsert: true,
        },
      }
    }
  },
)

export const queryOptions = ({
  limit,
  fields,
  sort,
}: {
  limit?: number | string
  fields?: string[]
  sort?: string[] | { [field: string]: 'ASC' | 'DESC' }[]
}) => {
  const options: {
    limit?: number
    projection?: { [field: string]: 0 | 1 }
    sort?: { [field: string]: 1 | -1 }
  } = {
    /**
     * See https://www.mongodb.com/docs/manual/reference/operator/aggregation/limit/
     */
    ...(limit ? { limit: Number(limit) } : {}),
    ...(fields
      ? {
        projection: fields.reduce(
          (acc, field) => ({ ...acc, [field]: 1 }),
          /**
           * Mongo will always return the _id, even if not present in the projection.
           * You can explicitly instruct Mongo not to return the _id by setting it to 0
           * in the projection.
           *
           * So we start with setting _id to 0. If it is in the fields array, it will overridden
           * with a 1, which will cause it to be included in the projection, which is what we want
           *
           * See https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/#suppress-_id-field
           */
          { _id: 0 },
        ),
      }
      : {}),
    ...(sort ? { sort: mapSort(sort) } : {}),
  }

  return options
}

/**
 * Map the hyper sort syntax to the mongo sort syntax
 *
 * See https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
 *
 * TL;DR: 1 is ascending, -1 is descending
 */
export const mapSort = (
  sort: string[] | { [field: string]: 'ASC' | 'DESC' }[],
) => {
  if (!sort || !sort.length) return sort

  // deno-lint-ignore ban-ts-comment
  // @ts-ignore
  return sort.reduce((acc, cur) => {
    /**
     * The default order is ascending, if only the field name is provided
     */
    if (typeof cur === 'string') return { ...acc, [cur]: 1 }
    if (typeof cur === 'object') {
      const key = Object.keys(cur)[0]
      return { ...acc, [key]: cur[key] === 'DESC' ? -1 : 1 }
    }
    /**
     * ignore the invalid sort value
     *
     * This should never happen because the wrapping zod schema would catch it
     * but just to be explicit
     */
    return acc
  }, {} as { [field: string]: 1 | -1 })
}

export const toHyperErr = (err: unknown) => {
  if (isHyperErr(err)) return err

  // TODO: map mongo errors to hyper errors
  // deno-lint-ignore no-explicit-any
  return HyperErr({ status: 400, msg: (err as any).message })
}
