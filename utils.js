import { R } from "./deps.js";

const { assoc, compose, map, omit, keys, values } = R;

export const swap = (a, b) =>
  compose(omit([a]), (doc) => assoc(b, doc[a], doc));

export const formatDocs = map((d) => {
  d = swap("id", "_id")(d);
  if (d._deleted) {
    return { deleteOne: { filter: { _id: d._id } } };
  } else if (d._update) {
    return {
      replaceOne: { filter: { _id: d._id }, replacement: omit(["_update"], d) },
    };
  } else {
    return { insert: { document: d } };
  }
});

export const queryOptions = ({ limit, fields, sort }) => {
  let options = {};
  options = limit ? assoc("limit", Number(limit), options) : options;
  options = fields
    ? assoc("projection", fields.reduce((a, v) => assoc(v, 1, a), {}), options)
    : options;
  options = sort
    ? assoc(
      "sort",
      sort.reduce(
        (a, v) => {
          return ({ ...a, [keys(v)[0]]: values(v)[0] === "DESC" ? -1 : 1 });
        },
        {},
      ),
      options,
    )
    : options;
  return options;
};
