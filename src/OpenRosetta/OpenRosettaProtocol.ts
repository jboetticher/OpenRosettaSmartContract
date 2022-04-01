import { SmartWeaveGlobal } from "redstone-smartweave";
declare const SmartWeave: SmartWeaveGlobal;

/**
 * Arweave smart contracts must start with a handle function. 
 * This is akin to the "main" function in other programming languages.
 * @param {*} state The data stored on the blockchain relevant to the smart contract.
 * @param {*} action 
 * @returns 
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handle(state, action) {

    return SmartWeave.block.height;
}

// Account handler
// Validation handler

/**
 * Paper Handler:
 *  Create/publish
 *      Author contribution + management
 *  Purchase
 */


class AuthorHandler {
    
}