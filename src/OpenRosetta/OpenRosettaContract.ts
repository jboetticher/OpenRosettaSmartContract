import { SmartWeaveGlobal, RedStoneLogger } from "redstone-smartweave";
import { NetworkState, ContractInput } from "./types/StateTypes";
import WalletHandler from "./WalletHandler";
import * as Inputs from "./types/FunctionInputs";
import RolesHandler from "./RolesHandler";
import PaperHandler from "./PaperHandler";

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

    // Destructures data from the contract.
    const func = action.input.function;
    const parameters = action.input.parameters;
    const caller = action.caller;

    // Role definitions.
    const ROLES = {
        "admin": 65000,
        "author": 100,
        "participant": 0,
        "banned": -1
    };

    // Logic classes handle all of the logic.
    // If this was REST, then consider them "controllers."
    const roleHandler = new RolesHandler(state, ROLES.admin);
    const walHandler = new WalletHandler(state);
    const pprHandler = new PaperHandler(state);

    // Different switches handle all of the public facing actions.
    // Should be made up of logic classes.
    switch (func) {
        // to: string (address), amount: number
        case "transfer": {
            const input = Inputs.TransferInput
                .validateInput(parameters.to, parameters.amount);
            roleHandler.requireTieredRole(caller, ROLES.participant);
            roleHandler.requireTieredRole(input.to, ROLES.participant);
            walHandler.transfer(caller, input.to, input.amount);
        }
            return { state };
        // to: string (address), amount: number, paperId: number
        case "transferKnowledge": {
            const input = Inputs.TransferKnowledgeInput
                .validateInput(parameters.to, parameters.amount, parameters.paperId);
            roleHandler.requireTieredRole(caller, ROLES.participant);
            roleHandler.requireTieredRole(input.to, ROLES.participant);
            walHandler.transferKnowledge(
                caller, input.to, input.amount, input.paperId);
        }
            return { state };
        // paperURL: string, paperSymbol: string, publishTimestamp: number
        // authors: string[], authorWeights: number[]
        case "publishPaper": {
            roleHandler.requireTieredRole(caller, ROLES.author);
            const input = Inputs.PublishPaperInput
                .validateInput(parameters.paperURL, 
                    parameters.paperSymbol, parameters.publishTimestamp, 
                    parameters.authors, parameters.authorWeights);
            pprHandler.publishPaper(caller, input.paperURL, input.paperSymbol, 
                input.publishTimestamp, input.authors, input.authorWeights);
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