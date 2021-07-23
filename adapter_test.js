import { adapter } from "./adapter.js";
import { assert, assertEquals } from "./dev_deps.js";
import { MongoClient } from "./deps.js";

const { test } = Deno;

const client = new MongoClient();
await client.connect("mongodb://127.0.0.1:27017");

const a = adapter(client);

test("create database", async () => {
  const result = await a.createDatabase("hyper~movies");
  assert(result.ok);
});

test("remove database", async () => {
  const result = await a.removeDatabase("hyper~movies");
  assert(result.ok);
});

test("create document", async () => {
  const result = await a.createDocument({
    db: "hyper~movies",
    id: "1-ghostbusters",
    doc: { title: "Ghostbusters", year: "1980", genre: ["comedy", "sci-fi"] },
  });
  assert(result.ok);
  assertEquals(result.id, "1-ghostbusters");
  // cleanup
  await a.removeDocument({ db: "hyper~movies", id: result.id });
});

test("get document", async () => {
  // setup

  await a.createDocument({
    db: "hyper~movies",
    id: "3-groundhog-day",
    doc: { title: "Groundhog Day", year: "1988", genre: ["comedy"] },
  });

  // get document
  const doc = await a.retrieveDocument({
    db: "hyper~movies",
    id: "3-groundhog-day",
  });
  assertEquals(doc._id, "3-groundhog-day");
  assertEquals(doc.title, "Groundhog Day");
  // cleanup
  await a.removeDocument({ db: "hyper~movies", id: "3-groundhog-day" });
});

test("update document", async () => {
  // setup

  await a.createDocument({
    db: "hyper~movies",
    id: "5-caddyshack",
    doc: { title: "Caddyshack", year: "1978", genre: ["comedy"] },
  });

  // update document

  const result = await a.updateDocument({
    db: "hyper~movies",
    id: "5-caddyshack",
    doc: { title: "Caddyshack", year: "1979", genre: ["comedy", "sports"] },
  });

  assert(result.ok);

  // cleanup
  await a.removeDocument({ db: "hyper~movies", id: "5-caddyshack" });
});

test("query documents", async () => {
  // setup

  await a.createDocument({
    db: "hyper~movies",
    id: "10-caddyshack",
    doc: { title: "Caddyshack", year: "1978", genre: ["comedy"] },
  });

  await a.createDocument({
    db: "hyper~movies",
    id: "12-ghostbusters",
    doc: { title: "Ghostbusters", year: "1980", genre: ["comedy"] },
  });

  // query document

  const result = await a.queryDocuments({
    db: "hyper~movies",
    query: {
      selector: { year: { $gt: "1979" } },
    },
  });

  assert(result.ok);

  // cleanup
  await a.removeDocument({ db: "hyper~movies", id: "10-caddyshack" });
  await a.removeDocument({ db: "hyper~movies", id: "12-ghostbusters" });
});

test("list documents", async () => {
  // setup

  await a.createDocument({
    db: "hyper~movies",
    id: "20-caddyshack",
    doc: { title: "Caddyshack", year: "1978", genre: ["comedy"] },
  });

  await a.createDocument({
    db: "hyper~movies",
    id: "22-ghostbusters",
    doc: { title: "Ghostbusters", year: "1980", genre: ["comedy"] },
  });

  // query document

  const result = await a.listDocuments({
    db: "hyper~movies",
    limit: 2,
    startkey: "20",
  });

  assert(result.ok);
  assertEquals(result.docs.length, 2);

  // cleanup
  await a.removeDocument({ db: "hyper~movies", id: "20-caddyshack" });
  await a.removeDocument({ db: "hyper~movies", id: "22-ghostbusters" });
});
