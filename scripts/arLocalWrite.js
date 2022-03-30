import { SmartWeaveNodeFactory } from 'redstone-smartweave';
import Arweave from 'arweave';
import wallet from '../keyfile.json';
import fetch from "node-fetch";

// Arweave instance is currently pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});
const smartweave = SmartWeaveNodeFactory.memCached(arweave);



/**
 *  The "action" that we add to our contract.
 *  Recall that contracts require a `handle(state, action)`. 
 *  Read the README to learn how to use this script with npm.
 */
const func = process.env.npm_config_function ?? 'increment';

/**
 * The data that we add to our contract's function.
 */
const data = { };

/**
 *  Place the contract's default transaction here.
 *  Read the README to learn how to use this script with npm.
 */
let contractTx = "IVfYQHaObH0U7WzxB8xcuGio7wqmPuxH0OmH0zi6eAQ";
if(process.env.npm_config_tx != null) contractTx = process.env.npm_config_tx;



// Connect to a preexisting smart contract
const contract = smartweave
    .contract(contractTx)
    .connect(wallet)
    .setEvaluationOptions({
        // All writes will wait for the transaction to be confirmed
        waitForConfirmation: true
    });

async function update() {
    const details = await contract.writeInteraction({
        function: func,
        data: data
    });
    await fetch("http://localhost:1984/mine");
    return details;
}
update();