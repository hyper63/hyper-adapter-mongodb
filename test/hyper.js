import { appOpine, core } from "../dev_deps.js";
import mongo from "../mod.js";
import PORT_NAME from "../port_name.js";

const hyperConfig = {
  app: appOpine,
  adapters: [
    { port: PORT_NAME, plugins: [mongo("mongodb://127.0.0.1:27017")] },
  ],
};

core(hyperConfig);
