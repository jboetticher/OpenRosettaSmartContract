import { SmartWeaveGlobal, RedStoneLogger } from "redstone-smartweave";
import { NetworkState, ContractInput } from "./types/StateTypes";
import WalletHandler from "./WalletHandler";
import * as Inputs from "./types/FunctionInputs";

//declare const SmartWeave: SmartWeaveGlobal;
declare const logger: RedStoneLogger;
declare const ContractError;

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
    const walHandler = new WalletHandler(state);

    const func = action.input.function;
    logger.warn("Function being called: " + func);
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
            return { state };
        // to: string (address), amount: number, paperId: number
        case "transferKnowledge": {
            const input = Inputs.TransferKnowledgeInput
                .validateInput(parameters.to, parameters.amount, parameters.paperId);
            walHandler.transferKnowledge(
                caller, input.to, input.amount, input.paperId);
        }
            return { state };
        // ???
        case "publishPaper": {
            // TODO: insert paper handler
        }
            return { state };
        default:
            throw ContractError("Function is not defined.");
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