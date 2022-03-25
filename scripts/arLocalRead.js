import { readContract } from 'smartweave';
import Arweave from 'arweave';

// https://cedriking.medium.com/lets-buidl-smartweave-contracts-2-16c904a8692d

// Init an arweave instance just like before.
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
let contractIntialStateTx = "8y3hPM_T_ruG92g1kZxcVoABhpI-j1hjacEL78sS-B0";
if(process.env.npm_config_tx != null) contractIntialStateTx = process.env.npm_config_tx;



async function getLatestState() {
    const latestState = await readContract(arweave, contractIntialStateTx);
    console.log(latestState);
}
getLatestState();