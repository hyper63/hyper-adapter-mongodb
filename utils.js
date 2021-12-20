import { R } from "./deps.js";

const { assoc, map, omit, keys, values, lens, prop } = R;

export const xId = lens(prop("_id"), assoc("id"));

export const formatDocs = map((d) => {
  d = omit(["id"], {
    ...d,
    _id: d._id || d.id,
  });

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
