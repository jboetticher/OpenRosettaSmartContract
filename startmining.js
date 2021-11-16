import Arweave from "arweave";

const port = 1990;

async function main() {
  const arweave = Arweave.init({
    host: "localhost",
    port: port,
    protocol: "http",
  });

  const continually_mine = setInterval(async function () {
    await arweave.api.get("mine");
    console.log("mined");
  }, 6000);
}

main();
