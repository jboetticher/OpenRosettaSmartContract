/* 
 *  This is a script that can deploy a SmartWeave contract. You could simply use 
 *  the SmartWeave CLI instead.
 * 
 *  Based off of the script written by Cedrik Boudreau.
 *  https://cedriking.medium.com/lets-buidl-smartweave-contracts-6353d22c4561
 * 
 *  @TODO: replace contractSource and initialState with actual data.
*/

import Arweave from 'arweave';
import fs from 'fs';
import addTokensToArLocal from "./addTokensToArLocal.js";
import packageJson from '../package.json';
import wallet from '../keyfile.json';

// Arweave instance is currently pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});

// Data
import initialState from "../src/HelloWorld/HelloWorldState.json";
const contractSource = fs.readFileSync('./src/HelloWorld/HelloWorldContract.js', 'utf8'); // script should be run in base directory

async function createContract() {
    // Add tokens to local address
    await addTokensToArLocal();

    // Let's first create the contract transaction.
    const contractTx = await arweave.createTransaction({ data: contractSource }, wallet);
    contractTx.addTag('App-Name', packageJson.name);
    contractTx.addTag('App-Version', packageJson.version);
    contractTx.addTag('Content-Type', 'application/javascript');

    // Sign
    await arweave.transactions.sign(contractTx, wallet);
    const contractSourceTxId = contractTx.id;
    console.log("Contract Source Transaction Id: " + contractSourceTxId);

    // Deploy the contract source
    await arweave.transactions.post(contractTx);
    console.log("Contract transaction posted.");

    // Now, let's create the Initial State transaction
    const initialStateTx = await arweave.createTransaction({ data: initialState }, wallet);
    console.log("Initial State Transaction: ", initialStateTx);
    initialState.addTag('App-Name', packageJson.name);
    initialState.addTag('App-Version', packageJson.version);
    initialState.addTag('Contract-Src', contractSourceTxId);
    initialState.addTag('Content-Type', 'application/json');
    console.log("Tags added to initial state.");

    // Sign
    await arweave.transactions.sign(initialState, wallet);
    const initialStateTxId = initialState.id;
    console.log("Initial State Transaction Id: " + initialStateTxId);

    // Deploy
    await arweave.transactions.post(initialState);
}
createContract();