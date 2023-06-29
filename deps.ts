/**
 * Shim hand-rolled crocks types
 */
// @deno-types="./crocks.d.ts"
export { default as crocks } from 'https://cdn.skypack.dev/crocks@0.12.4'
export * as R from 'https://cdn.skypack.dev/ramda@^0.29.0?dts'

export { EJSON } from 'npm:bson@5.3.0'
export { type Collection, MongoClient } from 'npm:mongodb@5.6.0'
export { default as cuid } from 'npm:cuid@3.0.0'

export {
  HyperErr,
  isHyperErr,
} from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-utils%40v0.1.1/packages/utils/hyper-err.js'
