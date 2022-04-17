/**Data that is expected to be inputted into the smart contract as "input". */
export type ContractInput = {
    /**Data that is inputted into contract call. */
    input: {
        /**The name of the function the caller is trying to call. */
        function: string,
        /**The parameters that the user wants to input into the function. */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parameters: any
    },

    /**Address of the contract's caller. */
    caller: string
}

/**Data that encompasses the entire network's state. */
export type NetworkState = {
    /**Total amount of rosetta mined in the network.*/
    totalRosetta: number;

    /**The next paperId to be published. */
    nextPaperId: number;

    /**The id of the next network change. */
    nextNetworkChangeId: number;

    /**
     * An array of all administrator configurations on the network.
     * The key of the array is each administrator's wallet.
     */
    administrators: AdministratorState[];

    /**Network global configurables. */
    config: NetworkConfig;

    /**
     * An array of all wallets that hold or have held rosetta related tokens.
     * The key of the array is the address.
     */
    wallets: RosettaWallet[];

    /**
     * An array of all of the papers published.
     * The key of the array is the paper id.
     */
    papers: PaperState[];

    /**
     * An array of all of the current network change proposals.
     * The key of the array is the changeProposalId.
     */
    networkChangeProposals: NetworkChangeProposal[];
}

/**Configuration of the network (miscellaneous globals). */
export type NetworkConfig = {
    /**The wallet that collects knowledge tokens allocated to the network. */
    treasuryWallet: string;

    /**The stake in Rosetta required to publish a paper. */
    publicationStake: number;

    /**The number of tokens minted for authors once a paper is published. */
    knowledgeTokenAuthorMint: number; // 1500

    /**The number of tokens minted & reserved for future validators once a paper is published. */
    knowledgeTokenReplicatorMint: number; // 100

    /**The number of tokens minted for the network once a paper is published. */
    knowledgeTokenTreasuryMint: number; // 384

    /**How long an author's Rosetta & tokens are locked after a publication. */
    publicationLockDuration: number;


    juryDutyStake: number;
    juryDutyFee: number;
    initialJury: number;
    validationStake: number;
    transactionFee: number;
    trialDuration: number;
    minMint: number;
    currentMint: number;
    decayRate: number;
}

/**A type that represents an administrator's configuration. */
export type AdministratorState = {
    canVote: boolean;
}

/**A wallet that holds rosetta and knowledge tokens. */
export type RosettaWallet = {
    /**The amount of rosetta that this wallet holds. */
    amount: number,

    /**The role value associated with this user. */
    role: number,

    /**
     * An array of paper stakes (for publishing) within the wallet.
     * The key of the array is the id of the paper.
     */
    paperStakes: PaperStake[],

    /**
     * An array of knowlege tokens that the wallet holds.
     * The key of the array is the id of the paper.
     */
    knowledgeTokens: KnowledgeWallet[]
}

/**A type that holds knowledge tokens. */
export type KnowledgeWallet = {
    /**The amount of knowledge tokens owned. */
    amount: number,

    /** The locked wallet values. */
    locked: {
        /** Timestamp of when the lock has finishes. */
        unlock: number;
        /** How much is locked up. */
        amount: number;
    };
}

/**A type that shows how much has been staked on a paper. */
export type PaperStake = {
    /**The amount of rosetta staked on a paper. */
    amount: number,

    /**When the rosetta is unlocked from the paper. */
    until: number
}

/**A type that represents all information about a published paper. */
export type PaperState = {
    /**A link to the paper/artefact itself. */
    url: string;

    /**The ticker of the knowledgeToken. */
    symbol: string;

    /**When the paper was reportedly published. */
    publishTimestamp: number;

    /**When the paper was published on the OpenRosetta. */
    networkPublishTimestamp: number;

    /**True if the paper has been invalidated by a tribunal. */
    invalidated: boolean;

    /** ??? */
    stakingWallet: string;

    /**The paper's current impact score. */
    impactScore: number;

    /** ??? */
    falsificationPool: number;

    /** ??? */
    replicationPool: Array<number>;

    /**The knowledge tokens reserved for the replication pool. */
    replicationReservedTokens: number;
}

/**A type that represents a change to the network config. */
export type NetworkChangeProposal = {
    /**All of the votes curently casted. */
    votes: { voter: string, vote: boolean }[];

    /**If voting of this change is still active. */
    votingActive: boolean;

    /**When the voting for the proposal ended. Default 0. */
    votingEnded: number;

    /**Whether or not the network change proposal passed. */
    outcome: boolean;

    /**When the network change proposal was created. */
    created: number;

    /**The changes being proposed in this proposal. */
    changes: NetworkChange[];
}

/**An enum that represents the possible network changes that can be proposed. */
// eslint-disable-next-line no-shadow
export enum NetworkChangeIds {
    NewConfig = 'NEW_CONFIG',
    NewAdmin = 'NEW_ADMIN',
    RemoveAdmin = 'REMOVE_ADMIN'
}

/**Data that represents a network change. */
export type NetworkChange = {
    changeId: NetworkChangeIds;
    data: string | NetworkChange;
}