import { NetworkChange, NetworkChangeIds, NetworkChangeProposal, NetworkState } from "./types/StateTypes";
import { assertNetworkConfig } from "./types/FunctionInputs";
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
        // Ensure that you can vote on the proposal.
        const proposal: NetworkChangeProposal = this.state.networkChangeProposals[networkChangeId];
        if (proposal === undefined)
            throw new ContractError("Cannot vote on a proposal that hasn't been defined!");
        else if (!proposal.votingActive)
            throw new ContractError("Cannot vote on a proposal that has ended!");

        // Add vote to the change.
        proposal.votes[caller] = vote;

        // Calculate votes
        const totalVotes = proposal.votes.length;
        const yesVotes = proposal.votes.filter(v => v).length;
        const nayVotes = totalVotes - yesVotes;
        const requiredVotes =
            this.state.administrators.filter(a => a.canVote).length / 2;

        const assertString = function(change): string {
            if (typeof (change.data) !== 'string') throw new ContractError(
                "Data is indecipherable!");
            return(change.data);
        };

        // Apply resolution if required votes are met.
        if (yesVotes > requiredVotes) {
            // Loop through all of the changes
            let change: NetworkChange;
            for (change of proposal.changes) {
                switch (change.changeId) {
                    case NetworkChangeIds.NewConfig:
                        const config = assertNetworkConfig(change.data);
                        this.state.config = config;
                        break;
                    case NetworkChangeIds.NewAdmin:
                        const newAdmin = assertString(change);
                        this.state.administrators[newAdmin] = {
                            canVote: true
                        };
                        break;
                    case NetworkChangeIds.RemoveAdmin:
                        const oldAdmin = assertString(change);
                        delete this.state.administrators[oldAdmin];
                        break;
                    case NetworkChangeIds.GrantAdminVotingRights:
                        const gvAdmin = assertString(change);
                        if(!(gvAdmin in this.state.administrators)) throw new ContractError(
                            "Provided address not an administrator, cannot grant rights!");
                        this.state.administrators[gvAdmin].canVote = true;
                        break;
                    case NetworkChangeIds.RevokeAdminVotingRights:
                        const rvAdmin = assertString(change);
                        if(!(rvAdmin in this.state.administrators)) throw new ContractError(
                            "Provided address not an administrator, cannot revoke rights!");
                        this.state.administrators[gvAdmin].canVote = false;
                        break;
                    default:
                        throw new ContractError(
                            `Incorrect network changeId ${change.changeId} in proposal!`);
                }
            }

            proposal.votingEnded = SmartWeave.block.timestamp;
            proposal.votingActive = false;
            proposal.outcome = true;
        }
        else if (nayVotes > requiredVotes) {
            proposal.votingEnded = SmartWeave.block.timestamp;
            proposal.votingActive = false;
            proposal.outcome = false;
        }
    }
}