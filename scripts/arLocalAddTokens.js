import fetch from "node-fetch";
import addressJson from '../address.json';

let address = addressJson.address;
export default async function arLocalAddTokens() {
    await fetch(`http://localhost:1984/mint/${address}/20000000000000000000`);
    await fetch(`http://localhost:1984/mine`);
    console.log(`ArLocal Tokens added to ${address}.`);
};