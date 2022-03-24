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
import packageJson from './package.json';
const arweave = Arweave.init({
    host: 'arweave.net',
    protocol: 'https',
    port: 443
});

async function createContract() {
    // Let's first create the contract transaction.
    const contractTx = await arweave.createTransaction({ data: contractSource }, wallet);
    contractTx.addTag('App-Name', packageJson.name);
    contractTx.addTag('App-Version', packageJson.version);
    contractTx.addTag('Content-Type', 'application/javascript');

    // Sign
    await arweave.transactions.sign(contractTx, wallet);
    const contractSourceTxId = contractTx.id;

    // Deploy the contract source
    await arweave.transactions.post(contractTx);

    // Now, let's create the Initial State transaction
    const initialStateTx = await arweave.createTransaction({ data: initialState }, wallet);
    initialState.addTag('App-Name', packageJson.name);
    initialState.addTag('App-Version', packageJson.version);
    initialState.addTag('Contract-Src', contractSourceTxId);
    initialState.addTag('Content-Type', 'application/json');

    // Sign
    await arweave.transactions.sign(initialState, wallet);
    const initialStateTxId = initialState.id;
    // Deploy
    await arweave.transactions.post(initialState);
}
createContract();