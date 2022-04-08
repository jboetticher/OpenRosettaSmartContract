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
    /**
     * Total amount of rosetta mined in the network.
     */
    totalRosetta: number;

    /**
     * An array of all wallets that hold or have held rosetta related tokens.
     * The key of the array is the address.
     */
    wallets: RosettaWallet[];
    potato: string;
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

    /**Value locked within the knowledge wallet. */
    locked: {
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