import { SmartWeaveGlobal } from "redstone-smartweave";
import UtilsHandler from "./UtilsHandler";

//declare const SmartWeave: SmartWeaveGlobal;
const utils = new UtilsHandler();

/**
 * Arweave smart contracts must start with a handle function. 
 * This is akin to the "main" function in other programming languages.
 * @param {*} state The data stored on the blockchain relevant to the smart contract.
 * @param {*} action 
 * @returns 
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handle(state, action) {



    switch (action.function) {

    }
}




// Account handler
// Validation handler

/**
 * Paper Handler:
 *  Create/publish
 *      Author contribution + management
 *  Purchase
 */