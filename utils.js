import { R } from './deps.js'

const { assoc, compose, map, omit } = R

export const swap = (a, b) =>
  compose(omit([a]), (doc) => assoc(b, doc[a], doc));

export const formatDocs = map(d => {
  d = swap('id', '_id')(d)
  if (d._deleted) {
    return { deleteOne: { filter: { _id: d._id } } }
  } else if (d._update) {
    return { replaceOne: { filter: { _id: d._id }, replacement: omit(['_update'], d) } }
  } else {
    return { insert: { document: d } }
  }
})