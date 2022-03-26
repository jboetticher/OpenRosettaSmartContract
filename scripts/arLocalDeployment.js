/* 
 *  This is a script that can deploy a SmartWeave contract. You could simply use 
 *  the SmartWeave CLI instead.
 * 
 *  @TODO: replace contractSource and initialState with actual data.
*/

import Arweave from 'arweave';
import { createContract, interactWrite, readContract } from 'smartweave';
import fs from 'fs';
import arLocalAddTokens from "./arLocalAddTokens.js";
import wallet from '../keyfile.json';
import fetch from "node-fetch";

// Arweave instance is currently pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});



/**
 *  If you want to create a contract, replace these sources with your proper contract
 *  and initial state json.
 *  You should run this script from the base directory.
 */ 
const initialState = fs.readFileSync('./src/HelloWorld/HelloWorldState.json', 'utf8');
const contractSource = fs.readFileSync('./src/HelloWorld/HelloWorldContract.js', 'utf8');



async function create() {
    // Add tokens to local address
    await arLocalAddTokens();

    const createTx = await createContract(arweave, wallet, contractSource, initialState);
    console.log(createTx);
    await fetch("http://localhost:1984/mine");

    /*
    await fetch("http://localhost:1984/mine");
    let latestState = await readContract(arweave, createTx);
    console.log(latestState);

    const input = { function: 'increment'};
    let writeId = await interactWrite(arweave, wallet, createTx, input);
    console.log(writeId);

    await fetch("http://localhost:1984/mine");

    writeId = await interactWrite(arweave, wallet, createTx, input);
    console.log(writeId);

    */

    let latestState = await readContract(arweave, createTx);
    console.log("Initial State:")
    console.log(latestState);
}
create();