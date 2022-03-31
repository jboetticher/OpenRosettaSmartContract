import Arweave from 'arweave';
import { SmartWeaveNodeFactory } from 'redstone-smartweave';
import wallet from '../keyfile.json';

// Create an Arweave instance pointing at ArLocal
const arweave = Arweave.init({
    host: 'localhost',
    protocol: 'http',
    port: 1984
});

// Create a SmartWeave client
const smartweave = SmartWeaveNodeFactory.memCached(arweave);

// Connect to a preexisting smart contract
const contract = smartweave
    .contract("TRANSACTION_ID")
    .connect(wallet)
    .setEvaluationOptions({
        // All writes will wait for the transaction to be confirmed
        waitForConfirmation: true
    });

// Read state from contract
async function readState(contract) {
    const { state, validity } = await contract.readState();

    // state is the object with the latest state (probably most useful)
    // validity is an object with valid and invalid transaction IDs
}

// Interact/Write to contract
async function writeInteraction(contract, functionName) {
    return await contract.writeInteraction({
        function: "NAME_OF_YOUR_FUNCTION",
        data: { } // the data to put in the interaction
    });
    await fetch("http://localhost:1984/mine");
}

