import { crocks, HyperErr, isHyperErr, R } from './deps.ts'

const { map, omit, ifElse, evolve, applyTo, propOr } = R
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
  /**
   * Notice use_index is not mapped here, as MongoDB
   * internally chooses an index to use.
   *
   * So use_index is effectively ignored
   */
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

/**
 * Generate string templates using named keys
 * to pull values from a provided dictionary
 */
const template =
  (strings: TemplateStringsArray, ...keys: string[]) => (dict: Record<string, string>) => {
    const result = [strings[0]]
    keys.forEach((key, i) => {
      result.push(dict[key], strings[i + 1])
    })
    return result.join('')
  }

export const mongoErrToHyperErr =
  // deno-lint-ignore no-explicit-any
  (context: Record<string, string>) => (mongoErr: any) => {
    if (isHyperErr(mongoErr)) return mongoErr

    const params = evolve(
      /**
       * Apply the msg template to the provided context
       * to produce the final msg on the HyperErr
       */
      { msg: applyTo({ ...context }) },
      /**
       * Map MongoDB statuses to corresponding HyperErr status
       * and templated msg
       */
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      propOr(
        {
          status: mongoErr.status || 500,
          message: mongoErr.message || 'an error occurred',
        },
        /**
         * Each MongoDB error comes back with a code
         */
        String(mongoErr.code),
        /**
         * A map of MongoDB error codes to HyperErr shapes,
         * each containing a corresponding status and msg template
         * to generate the msg on the HyperErr using the provided context
         *
         * See https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.yml
         */
        {
          '11000': {
            status: 409,
            msg: template`${'subject'} already exists`,
          },
        },
      ),
    )
    // deno-lint-ignore no-explicit-any
    return HyperErr(params as any)
  }
