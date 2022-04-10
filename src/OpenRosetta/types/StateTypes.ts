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

    /**
     * An array of value locked within the knowledge wallet.
     * The key of the array is the timestamp where the tokens can be unlocked.
     */
    locked: {
        // Not sure if this is used, but keeping it for backwards functionality.
        /**Amount of rosetta locked. */
        rosetta: number,

        /**Amount of knowlege token locked. */
        knowledgeToken: number
    }[]
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

    falsificationPool: number;

    replicationPool: Array<number>;

    /**The knowledge tokens reserved for the replication pool. */
    replicationReservedTokens: number;
}