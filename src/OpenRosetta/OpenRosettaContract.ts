import { SmartWeaveGlobal } from "redstone-smartweave";
import { NetworkState, ContractInput } from "./types/StateTypes";
import UtilsHandler from "./UtilsHandler";
import WalletHandler from "./WalletHandler";
import * as Inputs from "./types/FunctionInputs";

//declare const SmartWeave: SmartWeaveGlobal;

/**
 * Arweave smart contracts must start with a handle function. 
 * This is akin to the "main" function in other programming languages.
 * @param {NetworkState} state The data stored on the blockchain relevant to the smart contract.
 * @param {ContractInput} action The data inputted into the contract. 
 * @returns The new network state.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handle(state: NetworkState, action: ContractInput) {

    // Logic classes handle all of the logic.
    // If this was REST, then consider them "controllers."
    const utils = new UtilsHandler();
    const walHandler = new WalletHandler(state);

    const func = action.input.function;
    const parameters = action.input.parameters;
    const caller = action.caller;

    // Different switches handle all of the public facing actions.
    // Should be made up of logic classes.
    switch (func) {
        // to: string (address), amount: number
        case "transfer": {
            const input = Inputs.TransferInput
                .validateInput(parameters.to, parameters.amount);
            walHandler.transfer(caller, input.to, input.amount);
        }
        case "transferKnowledge": {
            const input = Inputs.TransferKnowledgeInput
                .validateInput(parameters?.to, parameters.amount, parameters.paperId);
            walHandler.transferKnowledge(
                caller, input.to, input.amount, input.paperId);
        }
        // TODO: knowledge token transfer
        case "createTrial": {
            // TODO: trial logic
        }
    }

    return { state };
}




// Account handler
// Validation handler

/**
 * Paper Handler:
 *  Create/publish
 *      Author contribution + management
 *  Purchase
 */