import adapter from "./adapter.js";
import PORT_NAME from "./port_name.js";

export default () => ({
  id: "mongodb",
  port: PORT_NAME,
  load: () => ({}), // load env
  link: (env) => (_) => adapter(env), // link adapter
});
