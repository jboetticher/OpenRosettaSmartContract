import { SmartWeaveNodeFactory } from 'redstone-smartweave';
import Arweave from 'arweave';
import wallet from '../keyfile.json';

// Arweave instance is currently pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});
const smartweave = SmartWeaveNodeFactory.memCached(arweave);



/**
 *  Place the contract's default transaction here.
 *  Read the README to learn how to use this script with npm.
 */
let intialStateTx = "IVfYQHaObH0U7WzxB8xcuGio7wqmPuxH0OmH0zi6eAQ";
if(process.env.npm_config_tx != null) intialStateTx = process.env.npm_config_tx;



// Connect to a preexisting smart contract
const contract = smartweave
    .contract(intialStateTx)
    .connect(wallet)
    .setEvaluationOptions({
        // All writes will wait for the transaction to be confirmed
        waitForConfirmation: true
    });

async function getLatestState() {
    const { state, validity } = await contract.readState();
    console.log(state);
}
getLatestState();