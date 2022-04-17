import { NetworkChange, NetworkState } from "./types/StateTypes";
import { SmartWeaveGlobal, RedStoneLogger } from "redstone-smartweave";
import UtilsHandler from "./UtilsHandler";

declare const ContractError;
declare const SmartWeave: SmartWeaveGlobal;
declare const logger: RedStoneLogger;


/**
 * Handles all of the network admin actions.
 */
export default class AdminHandler {
    state: NetworkState;
    roleDefs: { author: number, admin: number };

    constructor(state: NetworkState, roleDefs: { author: number, admin: number }) {
        this.state = state;
        this.roleDefs = roleDefs;
    }

    /**
     * Onboards an address as an author.
     * @param {string} newAuthor the new author to onboard.
     */
    onboardAuthor(newAuthor: string) {
        if (!(newAuthor in this.state.wallets))
            this.state.wallets[newAuthor] = UtilsHandler.defaultWallet();

        const wal = this.state.wallets[newAuthor];
        if (wal.role < this.roleDefs.author)
            wal.role = this.roleDefs.author;
    }

    /**
     * 
     */

    //NOTE: If there are too many inactive admins, there is a problem.
    //      A possible solution would be to put votes on a timer, and if
    //      at least X many administrators voted yes, and there is a majority
    //      yes, then let it pass.
    /**
     * Adds a proposal to change the network.
     * @param {NetworkChange][]} changes An array of changes that this proposal includes.
     */
    proposeNetworkChange(changes: NetworkChange[]) {
        const nextId = this.state.nextNetworkChangeId;
        this.state.networkChangeProposals[nextId] = {
            votes: [],
            votingActive: true,
            votingEnded: 0,
            outcome: false,
            created: SmartWeave.block.timestamp,
            changes: changes
        };
        this.state.nextNetworkChangeId += 1;
    }

    /**
     * Submits a vote on the network change proposal.
     * @param {string} caller The caller of the function.
     * @param {number} networkChangeId The id of the network change proposal to vote on.
     * @param {boolean} vote 
     */
    voteOnNetworkChangeProposal(
        caller: string,
        networkChangeId: number,
        vote: boolean) {
        // TODO: refactor the code
    }
}