import { NetworkState, RosettaWallet } from "./types/StateTypes";
import { SmartWeaveGlobal } from "redstone-smartweave";
import UtilsHandler from "./UtilsHandler";

declare const ContractError;
declare const SmartWeave: SmartWeaveGlobal;


/**
 * Handles all of the paper publishing & administration logic.
 */
export default class PaperHandler {
    state: NetworkState;

    constructor(state: NetworkState) {
        this.state = state;
    }

    /*

    "Any time a new research paper or artefact is published a unique set of
    knowledge tokens are generated."
    title: Theory of Everything, ticker: $TOE

    Authors own the knowledge tokens in the relative contribution decided at publish
        e.g. Jack = 40% and Mary = 50%? Ok distribute based on that

    */

    /*
    Changes to previous logic:
    - Added details about the paper onto the blockchian.
    - Fixed the knowledge token minting logic so that it would correctly use the network config.
    - Removed "reservedtokens". Authors must specify wallets before publishing on Rosetta.
    */

    /**
     * Publishes a paper to the network.
     * @param {string} creator The address of the author who pays the Rosetta stake.
     * @param {string} paperURL A link to the paper.
     * @param {string} paperSymbol The ticket of the knowledge token.
     * @param {number} publishTimestamp The reported timestamp that the paper was published.
     * @param {string[]} authors An array of author addresses.
     * @param {number[]} authorWeights The weights of each author.
     */
    publishPaper(creator: string, paperURL: string, paperSymbol: string,
        publishTimestamp: number, authors: string[], authorWeights: number[]) {

        // Logic specific validation
        if (!(creator in this.state.wallets))
            throw new ContractError("The caller has no wallet.");
        const creatorWallet: RosettaWallet = this.state.wallets[creator];
        if (creatorWallet.amount < this.state.config.publicationStake)
            throw new ContractError("The caller wallet does not have enough rosetta to stake against this paper")
        if (authors.length != authorWeights.length)
            throw new ContractError(
                "Number of authors is not equal to number of author weights.");

        // Normalizes the author weights.
        const authorWeightSum = authorWeights.reduce((a, b) => a + b);
        authorWeights.forEach((w, i, arr) => { arr[i] = w / authorWeightSum });

        // Ensure that every creator has a wallet.
        for (const a of authors)
            if (!(a in this.state.wallets))
                this.state.wallets[a] = UtilsHandler.defaultWallet();

        // Gets the new paperId.
        const paperId = this.state.nextPaperId;
        this.state.nextPaperId += 1;

        // Mints knowledge tokens for authors + treasury.
        const authorMint = this.state.config.knowledgeTokenAuthorMint;
        const authorUnlockTimestamp =
            SmartWeave.block.timestamp + this.state.config.publicationLockDuration;
        const treasuryMint = this.state.config.knowledgeTokenTreasuryMint;
        authors.forEach((addr, i) => {
            const authorWallet: RosettaWallet = this.state.wallets[addr];
            const authorTokens = authorMint * authorWeights[i];
            authorWallet.knowledgeTokens[paperId] = UtilsHandler.defaultKnowledgeWallet();
            authorWallet.knowledgeTokens[paperId].locked[authorUnlockTimestamp] =
                UtilsHandler.defaultKnowledgeLock(authorTokens);
        });
        this.state.wallets[this.state.config.treasuryWallet].knowledgeTokens[paperId] = {
            amount: treasuryMint,
            locked: []
        };

        // Creator must stake rosetta.
        creatorWallet.amount -= this.state.config.publicationStake;
        creatorWallet.paperStakes[paperId] = {
            amount: this.state.config.publicationStake,
            until: authorUnlockTimestamp
        }

        // Publishes the paper to the network.
        const replicationMint = this.state.config.knowledgeTokenReplicatorMint;
        this.state.papers[paperId] = {
            url: paperURL,
            symbol: paperSymbol,
            publishTimestamp: publishTimestamp,
            networkPublishTimestamp: SmartWeave.block.timestamp,
            invalidated: false,
            stakingWallet: creator,
            impactScore: 0,
            falsificationPool: 0,
            replicationPool: [0, 0, 0],
            replicationReservedTokens: replicationMint
        };
    }
}