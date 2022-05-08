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
     * A dictionary of all administrator configurations on the network.
     * The key of the dictionary is each administrator's wallet.
     */
    administrators: AdministratorState[];

    /**Network global configurables. */
    config: NetworkConfig;

    /**
     * A dictionary of all wallets that hold or have held rosetta related tokens.
     * The key of the dictionary is the address.
     */
    wallets: RosettaWallet[];

    /**
     * A dictionary of all of the papers published.
     * The key of the dictionary is the paper id.
     */
    papers: PaperState[];

    /**
     * An dictionary of all of the active trials.
     * The key of the dictionary is the paperId.
     */
    trials: Trial[];

    /**An array of past trials. */
    pastTrials: Trial[];

    /**The pool of available jurors. */
    juryPool: string[];

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

    /**How long the settlement duration of a trial should list. */
    settlementDuration: number;

    /**How long the jury duration of a trial should last. */
    juryDuration: number;

    /**The amount of Rosetta needed to stake to become a juror. */
    juryDutyStake: number;

    /**The amount of Rosetta reduced as penalty for being in the minority. */
    juryMinorityPenalty: number;

    /**The amount of Rosetta needed to pay a juror. */
    juryDutyFee: number;

    transactionFee: number;

    initialJury: number;
    validationStake: number;
    falsificationStake: number;
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

    /**The amount of network trust associated with this user. */
    trust: number,

    /**
     * An array of paper stakes (for publishing) within the wallet.
     * The key of the array is the id of the paper.
     */
    paperStakes: PaperStake[],

    /**
     * An array of knowlege tokens that the wallet holds.
     * The key of the array is the id of the paper.
     */
    knowledgeTokens: KnowledgeWallet[],

    /**Rosetta that this user has staked against jury duty. */
    juryStake: number
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

    /**The original authors of the paper. */
    authors: string[];

    // @TODO: citations

    /**When the paper was reportedly published. */
    publishTimestamp: number;

    /**When the paper was published on the OpenRosetta. */
    networkPublishTimestamp: number;

    /**True if the paper has been invalidated by a tribunal. */
    invalidated: boolean;

    /**The wallet who staked rosetta to publish the paper. Source of falsification. */
    stakingWallet: string;

    /**Rosetta in addition to that in the staking wallet for the falsification of this paper. */
    extraFalsificationPool: number;

    /**The paper's current impact score. */
    impactScore: number;

    /**Amount of rosetta tokens reserved for the replication pool. */
    replicationRosettaPool: number[];

    /**The amount of times the paper has been replicated. */
    replicationCount: number;

    /**The knowledge tokens reserved for the replication pool. */
    replicationReservedTokens: number;
}

/**A type that represents a change to the network config. */
export type NetworkChangeProposal = {
    /**
     * All of the votes curently casted. 
     * The key is the address of the person of voting.
    */
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
    RemoveAdmin = 'REMOVE_ADMIN',
    RevokeAdminVotingRights = 'REMOVE_ADMIN_VOTING_RIGHTS',
    GrantAdminVotingRights = 'GRANT_ADMIN_VOTING_RIGHTS',
}

/**Data that represents a network change. */
export type NetworkChange = {
    changeId: NetworkChangeIds;
    data: string | NetworkConfig;
}

/**Available states of a tribunal. */
// eslint-disable-next-line no-shadow
export enum TribunalState {
    PreJury,                            // Validator brings evidence & charges against paper
    Settlement,                         // Amicable settlement occurs without jury
    JuryDeliberation,                   // Jury is formed and is deciding their votes
    ClosedWithAppealOption,             // Tribunal concludes, with an option for an appeal.
    Closed,                             // Tribunal concludes, with no chance of an appeal.
    Appealed                            // An appeal was created, a new tribunal is formed.
}

/**Available outcomes of a tribunal */
// eslint-disable-next-line no-shadow
export enum TribunalOutcome {
    NoChanges,                          // No change to the paper has been made (acquittal or poor validation).
    Validation,                         // If the trial successfully validated the paper.
    Mistake,                            // If it has been found that there is a mistake in the paper.
    Fraud,                              // If it has been found that the paper committed fraud.
    MaliciousActivity                   // If it has been found that the paper committed malicious activity.
}

/**A type that represents a trial for a paper. */
export type Trial = {
    /**The id of the paper that a tribunal is made for. */
    paperId: number;

    /**The wallet of the validator (validating or falsifing). */
    validator: string;

    /**The amount of Rosetta staked against this validation. */
    validationStake: number;

    /**The amount of Rosetta forfeited by the validator to pay the jurors. */
    jurorFees: number;

    /**The amount of jurors in the trial. */
    trialSize: number;

    /**
     * A dictionary of settlement votes for the prejury step. 
     * True is pro settlement, false is against settlement, undefined means no vote.
     * The key is the wallet of the address.
     */
    settlementVotes: TribunalOutcome[];

    /**
     * A dictionary of settlement documents for the prejury step. 
     * The key is the wallet of the address who published the document.
     */
    settlementDocuments: string[];

    /**The outcome of the trial. */
    outcome: TribunalOutcome | false;

    /**
     * A dictionary of votes by the jury.
     * The key is the wallet of the juror.
     */
    jurorVotes: TribunalOutcome[],

    /**
     * A dictionary of settlement documents for the prejurystep.
     * The key is the wallet of the address who published the document.
     */
    jurorDocuments: string[],

    /**An array of this trial's juror wallets.  */
    currentJurors: string[],

    /**Current state of the tribunal. */
    currentState: TribunalState,

    /**The timestamp where the tribunal automatically ends. */
    juryUntil: number;

    /**How long the settlement phase of the tribunal should last. */
    settlementUntil: number;
}

export type ValidationTrial = Trial & {
    /**The paperId of the paper that is being submitted as a validating study. */
    validatingPaperId: number;
}

export type FalsificationTrial = Trial & {
    /**Proscecution evidence in the form of Arweave transactions. */
    prosecutionEvidence: string[]; // rename this to represent transactions?

    /**Defense evidence in the form of Arweave transactions. */
    defenseEvidence: string[], // rename this to represent transactions?
}