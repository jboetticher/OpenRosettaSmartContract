import fetch from "node-fetch";

export default async function arLocalAddTokens(arweave, wallet) {
    const address = await arweave.wallets.getAddress(wallet);
    await fetch(`http://localhost:1984/mint/${address}/20000000000000000000`);
    await fetch(`http://localhost:1984/mine`);
    console.log(`ArLocal Tokens added to ${address}.`);
}