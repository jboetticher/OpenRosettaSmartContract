import { interactWrite } from 'smartweave';
import Arweave from 'arweave';
import wallet from '../keyfile.json';
// https://cedriking.medium.com/lets-buidl-smartweave-contracts-2-16c904a8692d

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
let contractInitialStateTx = "_EfmT7II1VmD41eWAI3b_vnjsIJnN1-ZFWPxJWeXoLw";
if(process.env.npm_config_tx != null) contractInitialStateTx = process.env.npm_config_tx;

/*
Contract Source Transaction Id: _EfmT7II1VmD41eWAI3b_vnjsIJnN1-ZFWPxJWeXoLw
Initial State Transaction Id: ufqZcAEgg_i8xFR2Wf1n1yLZXJ-fOwgAMMuKxYcrsCc
*/

async function update() {
    // `interactWrite` will return the transaction ID.
    const txid = await interactWrite(arweave, wallet, contractInitialStateTx, input);
    console.log("Write finshed with transaction: " + txid);
}
update();