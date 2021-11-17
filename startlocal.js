const ArLocal = require('arlocal');
const Arweave = require("arweave");

const port = process.env.port;

(async () => {
  const arLocal = new ArLocal.default(port, false);

  // Start is a Promise, we need to start it inside an async function.
  await arLocal.start();

  // Your tests here...

  const arweave = Arweave.init({
    host: "localhost",
    port: port,
    protocol: "http",
  });

  const continually_mine = setInterval(async function () {
    await arweave.api.get("mine");
    console.log("mined");
  }, 60000);
})();