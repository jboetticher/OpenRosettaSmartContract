/* 
 *  This is a script that can deploy a SmartWeave contract.
 * 
*/
import Arweave from 'arweave';
import { SmartWeaveNodeFactory } from 'redstone-smartweave';
import fs from 'fs';
import arLocalAddTokens from "./arLocalAddTokens.js";
import wallet from '../keyfile.json';

// Arweave instance is currently pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});
const mine = () => arweave.api.get("mine");

// Create a SmartWeave client
const sw = SmartWeaveNodeFactory.memCached(arweave);



/**
 *  If you want to create a contract, replace these sources with your proper contract
 *  and initial state json.
 *  You should run this script from the base directory.
 */ 
const initialState = fs.readFileSync('./src/HelloWorld/HelloWorldState.json', 'utf8');
const contractSource = fs.readFileSync('./src/HelloWorld/HelloWorldContract.js', 'utf8');



async function create() {
    // Add tokens to local address
    await arLocalAddTokens(arweave, wallet);

    // Deploy contract
    const contractTx = await sw.createContract.deploy({
        wallet, 
        src: contractSource, 
        initState: initialState
    });
    console.log("Contract Transaction: " + contractTx);
    await mine();

    // Creates instance of the contract
    const contract = sw
        .contract(contractTx)
        .connect(wallet)
        .setEvaluationOptions({
            waitForConfirmation: true
        });

    // Read from the current state
    const { state, validity } = await contract.readState();
    console.log("Initial State:")
    console.log(state);
}
create();