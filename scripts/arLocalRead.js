import { readContract } from 'smartweave';
import Arweave from 'arweave';
// https://cedriking.medium.com/lets-buidl-smartweave-contracts-2-16c904a8692d

// Arweave instance is currently pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});




/**
 *  Place the contract's default transaction here.
 *  Read the README to learn how to use this script with npm.
 */
let intialStateTx = "ufqZcAEgg_i8xFR2Wf1n1yLZXJ-fOwgAMMuKxYcrsCc";
if(process.env.npm_config_tx != null) intialStateTx = process.env.npm_config_tx;

/*
Contract Source Transaction Id: _EfmT7II1VmD41eWAI3b_vnjsIJnN1-ZFWPxJWeXoLw
Initial State Transaction Id: ufqZcAEgg_i8xFR2Wf1n1yLZXJ-fOwgAMMuKxYcrsCc
*/

async function getLatestState() {
    const latestState = await readContract(arweave, intialStateTx);
    console.log(latestState);
}
getLatestState();