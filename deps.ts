/**
 * Shim hand-rolled crocks types
 */
// @deno-types="./crocks.d.ts"
export { default as crocks } from 'npm:crocks@0.12.4'
// @deno-types="npm:@types/ramda@^0.29.9"
export * as R from 'npm:ramda@0.29.1'

export { EJSON } from 'npm:bson@6.2.0'
export { type Collection, MongoClient } from 'npm:mongodb@6.3.0'
export { default as cuid } from 'npm:cuid@3.0.0'

import {
  HyperErr,
  isHyperErr as isHyperErrBase,
} from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-utils%40v0.1.2/packages/utils/hyper-err.js'

export { HyperErr }
/**
 * The new ramda types in hyper-utils are overly assuming, so
 * just wrap the isHyperErr from utils with a more unassuming signature
 */
// deno-lint-ignore no-explicit-any
export const isHyperErr = (v: any) => isHyperErrBase(v)
