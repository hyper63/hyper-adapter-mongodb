// Harness deps
import { default as appOpine } from "https://x.nest.land/hyper-app-opine@1.1.2/mod.js";
import { default as core } from "https://x.nest.land/hyper@1.4.0/mod.js";

import mongo from "../mod.js";
import PORT_NAME from "../port_name.js";

const hyperConfig = {
  app: appOpine,
  adapters: [
    { port: PORT_NAME, plugins: [mongo("mongodb://127.0.0.1:27017")] },
  ],
};

core(hyperConfig);
