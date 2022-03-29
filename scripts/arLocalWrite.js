import { interactWrite } from 'redstone-smartweave';
import Arweave from 'arweave';
import wallet from '../keyfile.json';
import fetch from "node-fetch";

// Arweave instance is currently pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});



/**
 *  The "action" that we add to our contract.
 *  Recall that contracts require a `handle(state, action)`. 
 *  Read the README to learn how to use this script with npm.
 */
const input = {
    function: process.env.npm_config_function ?? 'increment'
};

/**
 *  Place the contract's default transaction here.
 *  Read the README to learn how to use this script with npm.
 */
let contractInitialStateTx = "IVfYQHaObH0U7WzxB8xcuGio7wqmPuxH0OmH0zi6eAQ";
if(process.env.npm_config_tx != null) contractInitialStateTx = process.env.npm_config_tx;

async function update() {
    // `interactWrite` will return the transaction ID.
    const txid = await interactWrite(arweave, wallet, contractInitialStateTx, input);
    console.log("Write finshed with transaction: " + txid);
    await fetch("http://localhost:1984/mine");
}
update();