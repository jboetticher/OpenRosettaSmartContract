/* 
 *  This is a script that can deploy a SmartWeave contract. You could simply use 
 *  the SmartWeave CLI instead.
 * 
 *  Based off of the script written by Cedrik Boudreau. Required some corrections.
 *  https://cedriking.medium.com/lets-buidl-smartweave-contracts-6353d22c4561
 * 
 *  @TODO: replace contractSource and initialState with actual data.
*/

import Arweave from 'arweave';
import fs from 'fs';
import arLocalAddTokens from "./arLocalAddTokens.js";
import packageJson from '../package.json';
import wallet from '../keyfile.json';

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



async function createContract() {
    // Add tokens to local address
    await addTokensToArLocal();

    // Let's first create the contract transaction.
    const contractTx = await arweave.createTransaction({ data: contractSource }, wallet);
    contractTx.addTag('App-Name', packageJson.name);
    contractTx.addTag('App-Version', packageJson.version);
    contractTx.addTag('Content-Type', 'application/javascript');
    console.log("Tags added to initial contract transaction.");

    // Sign
    await arweave.transactions.sign(contractTx, wallet);
    const contractSourceTxId = contractTx.id;
    console.log("Contract Source Transaction Id: " + contractSourceTxId);

    // Deploy the contract source
    await arweave.transactions.post(contractTx);
    console.log("Contract transaction posted.");

    // Now, let's create the Initial State transaction
    const initialStateTx = await arweave.createTransaction({ data: initialState }, wallet);
    initialStateTx.addTag('App-Name', packageJson.name);
    initialStateTx.addTag('App-Version', packageJson.version);
    initialStateTx.addTag('Contract-Src', contractSourceTxId);
    initialStateTx.addTag('Content-Type', 'application/json');
    console.log("Tags added to initial state transaction.");

    // Sign
    await arweave.transactions.sign(initialStateTx, wallet);
    const initialStateTxId = initialStateTx.id;
    console.log("Initial State Transaction Id: " + initialStateTxId);

    // Deploy
    await arweave.transactions.post(initialStateTx);
}
createContract();