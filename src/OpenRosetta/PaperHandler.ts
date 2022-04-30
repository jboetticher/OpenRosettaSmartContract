import { NetworkState, PaperState, RosettaWallet } from "./types/StateTypes";
import { SmartWeaveGlobal, RedStoneLogger } from "redstone-smartweave";
import UtilsHandler from "./UtilsHandler";

declare const ContractError;
declare const SmartWeave: SmartWeaveGlobal;
declare const logger: RedStoneLogger;


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
        logger.warn("Timestamp: " + authorUnlockTimestamp);
        const treasuryMint = this.state.config.knowledgeTokenTreasuryMint;
        authors.forEach((addr, i) => {
            const authorWallet: RosettaWallet = this.state.wallets[addr];
            const authorTokens = authorMint * authorWeights[i];
            authorWallet.knowledgeTokens[paperId] = UtilsHandler.defaultKnowledgeWallet();
            authorWallet.knowledgeTokens[paperId].locked.amount = authorTokens;
            authorWallet.knowledgeTokens[paperId].locked.unlock = authorUnlockTimestamp;
        });
        this.state.wallets[this.state.config.treasuryWallet].knowledgeTokens[paperId] = {
            amount: treasuryMint,
            locked: { amount: 0, unlock: 0 }
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
            authors: authors,
            publishTimestamp: publishTimestamp,
            networkPublishTimestamp: SmartWeave.block.timestamp,
            invalidated: false,
            stakingWallet: creator,
            impactScore: 0,
            extraFalsificationPool: 0,
            /**
             * NOTE:
             * There is no documentation yet on how many replication pools there are. We assume 3.
             * There is no documentation on how many paper tokens RP1 gets vs RP2. Assuming equal division.
             */
            replicationRosettaPool: [0, 0, 0],
            replicationCount: 0,
            replicationReservedTokens: replicationMint
        };
    }

    /**
     * Allows a participant to donate Rosetta to one of a paper's replication pools.
     * @param volunteer The user adding a stake to a pool.
     * @param paperId The paper id to add a stake to.
     * @param amount How much Rosetta to donate to the pool.
     * @param pool The pool id to donate to.
     */
    volunteerReplicationDonation(volunteer: string, paperId: number, amount: number, pool: number) {
        const paper: PaperState = this.state.papers[paperId];
        if(paper === undefined)
            throw new ContractError(`Paper ${paperId} doesn't exist`);
        // NOTE: This is a default value, 3. Could be changed later.
        if(pool < 0 || pool >= 3 || !Number.isInteger(pool)) 
            throw new ContractError('There are only 3 pools.');
        if(paper.replicationCount > pool)
            throw new ContractError(`There have already been ${paper.replicationCount} replications.`);
        if(paper.invalidated)
            throw new ContractError('Paper is invalidated.');

        const volunteerWallet: RosettaWallet = this.state.wallets[volunteer];
        if(volunteerWallet === undefined)
            throw new ContractError("Volunteer's wallet doesn't exist.");
        if(volunteerWallet.amount < amount)
            throw new ContractError(`Volunteer does not have enough Rosetta to donate ${amount}.`);

        paper.replicationRosettaPool[pool] += amount;
        volunteerWallet.amount -= amount;
    }

    /**
     * Allows a participant to donate Rosetta to a paper's falsification pool.
     * @param volunteer The user adding a donation to the pool.
     * @param paperId The paper id to add a donation to.
     * @param amount How much Rosetta to donate to the pool.
     */    
    volunteerFalsificationDonate(volunteer: string, paperId: number, amount: number) {
        const paper: PaperState = this.state.papers[paperId];
        if(paper === undefined)
            throw new ContractError(`Paper ${paperId} doesn't exist`);
        if(paper.invalidated)
            throw new ContractError('Paper is already invalidated.');

        const volunteerWallet: RosettaWallet = this.state.wallets[volunteer];
        if(volunteerWallet === undefined)
            throw new ContractError("Volunteer's wallet doesn't exist.");
        if(volunteerWallet.amount < amount)
            throw new ContractError(`Volunteer does not have enough Rosetta to donate ${amount}.`);

        paper.extraFalsificationPool += amount;
        volunteerWallet.amount -= amount;
    }

    /**
     * Gets the total falsification stake on a paper.
     * @param paperId The paperId.
     * @returns The total falsification stake (in Rosetta) on a paper.
     */
    totalFalsificationStake(paperId: number) {
        const paper: PaperState = this.state.papers[paperId];
        if(paper === undefined)
            throw new ContractError(`Paper ${paperId} doesn't exist`); 
        const wallet: RosettaWallet = this.state.wallets[paper.stakingWallet];
        if(wallet === undefined || wallet.paperStakes[paperId] === undefined) 
            return paper.extraFalsificationPool;
        
        return wallet.paperStakes[paperId].amount + paper.extraFalsificationPool;
    }
}
