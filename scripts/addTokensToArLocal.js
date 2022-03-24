import fetch from "node-fetch";
import addressJson from '../address.json';

export default async function addTokensToArLocal() {
    await fetch(`http://localhost:1984/mint/${addressJson.address}/20000000000000000000`);
    await fetch(`http://localhost:1984/mine`);
    console.log(`ArLocal Tokens added to ${addressJson.address} branch.`);
};
