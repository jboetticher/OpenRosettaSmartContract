import { SmartWeaveGlobal, RedStoneLogger } from "redstone-smartweave";
import { NetworkState, ContractInput } from "./types/StateTypes";
import WalletHandler from "./WalletHandler";
import * as Inputs from "./types/FunctionInputs";
import RolesHandler from "./RolesHandler";
import PaperHandler from "./PaperHandler";
import AdminHandler from "./AdminHandler";
import TribunalHandler from "./TribunalHandler";

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
    const admnHandler = new AdminHandler(state, ROLES);
    const tbnlHandler = new TribunalHandler(state);

    // Different switches handle all of the public facing actions.
    // Should be made up of logic classes.
    switch (func) {
        // newAuthor: string
        case "onboardAuthor": {
            const input = Inputs.OnboardAuthorInput
                .validateInput(parameters.newAuthor);
            roleHandler.requireTieredRole(caller, ROLES.admin);
            admnHandler.onboardAuthor(input.newAuthor);
        }
            return { state };
        // changes: NetworkChange[]
        case "proposeNetworkChange": {
            const input = Inputs.ProposeNetworkChangeInput
                .validateInput(parameters.changes);
            roleHandler.requireTieredRole(caller, ROLES.admin);
            admnHandler.proposeNetworkChange(input.changes);
        }
            return { state };
        // networkChangeId: 0, vote: boolean
        case "voteOnNetworkChangeProposal": {
            const input = Inputs.VoteOnNetworkChangeProposalInput
                .validateInput(parameters.networkChangeId, parameters.vote);
            roleHandler.requireTieredRole(caller, ROLES.admin);
            if (!state.administrators[caller]?.canVote)
                throw new ContractError("Administrator does not have voting rights!");
            admnHandler.voteOnNetworkChangeProposal(
                caller, input.networkChangeId, input.vote);
        }
            return { state };
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
        // paperId: number, evidenceTx: string
        case "createFalsificationTribunal": {
            roleHandler.requireTieredRole(caller, ROLES.author);
            const input = Inputs.CreateFalsificationTribunalInput
                .validateInput(parameters.paperId, parameters.evidenceTx);
            tbnlHandler.createFalsificationTribunal(caller, input.paperId, input.evidenceTx);
        }
            return { state };
        case "joinJuryPool": {
            roleHandler.requireTieredRole(caller, ROLES.author);
            tbnlHandler.joinJuryPool(caller);
        }
            return { state };
        case "leaveJuryPool": {
            roleHandler.requireTieredRole(caller, ROLES.author);
            tbnlHandler.leaveJuryPool(caller);
        }
            return { state };
        // paperId: number, amount: number, pool: number
        case "volunteerReplicationDonation": {
            roleHandler.requireTieredRole(caller, ROLES.participant);
            const input = Inputs.VolunteerReplicationDonateInput
                .validateInput(parameters.paperId, parameters.amount, parameters.pool);
            pprHandler.volunteerReplicationDonation(
                caller, input.paperId, input.amount, input.pool);
        }
            return { state };
        // paperId: number, amount: number
        case "volunteerFalsificationDonate": {
            roleHandler.requireTieredRole(caller, ROLES.participant);
            const input = Inputs.VolunteerFalsificationDonateInput
                .validateInput(parameters.paperId, parameters.amount);
            pprHandler.volunteerFalsificationDonate(caller, input.paperId, input.amount);
        }
            return { state };
        default:
            throw ContractError("Function is not defined.");
    }
}