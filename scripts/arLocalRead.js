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
let intialStateTx = "IVfYQHaObH0U7WzxB8xcuGio7wqmPuxH0OmH0zi6eAQ";
if(process.env.npm_config_tx != null) intialStateTx = process.env.npm_config_tx;

async function getLatestState() {
    const latestState = await readContract(arweave, intialStateTx);
    console.log(latestState);
}
getLatestState();