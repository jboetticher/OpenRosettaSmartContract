import { NetworkChange, NetworkChangeIds, NetworkConfig } from "./StateTypes";

declare const ContractError;

/**
 * Asserts that a parameter is a number.
 * @param val The value that we are asserting is a number.
 * @param name The name of the variable.
 */
function assertNumber(val: unknown, name: string): void {
    if (typeof (val) != 'number' || Number.isNaN(val))
        throw new ContractError(`Paramater ${name} isn't a number.`);
}

/**
 * Asserts that a parameter is a string.
 * @param val The value that we are asserting is a string.
 * @param name The name of the variable.
 */
function assertString(val: unknown, name: string): void {
    if (typeof (val) != 'string')
        throw new ContractError(`Paramater ${name} isn't a string.`);
}

/**
 * Asserts that a parameter is a boolean.
 * @param val The value that we are asserting is a boolean.
 * @param name The name of the variable.
 */
function assertBoolean(val: unknown, name: string): void {
    if (typeof (val) != 'boolean')
        throw new ContractError(`Paramater ${name} isn't a boolean.`);
}

/**
 * Asserts that a parameter is an array.
 * @param val The value that we are asserting is an array.
 * @param name The name of the variable.
 */
function assertArray(val: unknown, name: string): void {
    if (!Array.isArray(val))
        throw new ContractError(`Parameter ${name} isn't an array.`);
}

/**
 * Manually checks if something is a network config.
 * @param config A possible network config.
 * @returns The validated network config.
 */
export function assertNetworkConfig(config: string | NetworkConfig): NetworkConfig {
    if (typeof (config) === 'string') throw new
        ContractError("Config must not be a string!");
    assertString(config.treasuryWallet, 'config.treasuryWallet');
    assertNumber(config.knowledgeTokenAuthorMint, 'config.knowledgeTokenAuthorMint');
    assertNumber(config.knowledgeTokenReplicatorMint, 'config.knowledgeTokenReplicatorMint');
    assertNumber(config.knowledgeTokenTreasuryMint, 'config.knowledgeTokenTreasuryMint');
    assertNumber(config.publicationLockDuration, 'config.publicationLockDuration');
    assertNumber(config.juryDutyStake, 'config.juryDutyStake');
    assertNumber(config.juryDutyFee, 'config.juryDutyFee');
    assertNumber(config.initialJury, 'config.initialJury');
    assertNumber(config.validationStake, 'config.validationStake');
    assertNumber(config.transactionFee, 'config.transactionFee');
    assertNumber(config.trialDuration, 'config.trialDuration');
    assertNumber(config.minMint, 'config.minMint');
    assertNumber(config.currentMint, 'config.currentMint');
    assertNumber(config.decayRate, 'config.decayRate');

    return config as NetworkConfig;
}

export class TransferInput {
    to: string;
    amount: number;

    constructor(to: string, amount: number) {
        this.to = to;
        this.amount = amount;
    }

    static validateInput(to, amount): TransferInput {
        assertString(to, "to");
        assertNumber(amount, "amount");
        return new TransferInput(to, amount);
    }
}

export class TransferKnowledgeInput {
    to: string;
    amount: number;
    paperId: number;

    constructor(to: string, amount: number, paperId: number) {
        this.to = to;
        this.amount = amount;
        this.paperId = paperId;
    }

    static validateInput(to, amount, paperId) {
        assertString(to, "to");
        assertNumber(amount, "amount");
        assertNumber(paperId, "paperId");
        return new TransferKnowledgeInput(to, amount, paperId);
    }
}

export class PublishPaperInput {
    paperURL: string;
    paperSymbol: string;
    publishTimestamp: number;
    authors: string[];
    authorWeights: number[];

    constructor(paperURL: string, paperSymbol: string,
        publishTimestamp: number, authors: string[], authorWeights: number[]) {
        this.paperURL = paperURL;
        this.paperSymbol = paperSymbol;
        this.publishTimestamp = publishTimestamp;
        this.authors = authors;
        this.authorWeights = authorWeights;
    }

    static validateInput(paperURL: string, paperSymbol: string,
        publishTimestamp: number, authors: string[], authorWeights: number[]): PublishPaperInput {
        assertString(paperURL, "paperURL");
        assertString(paperSymbol, "paperSymbol");
        assertNumber(publishTimestamp, "publishTimestamp");
        assertArray(authors, "authors");
        assertArray(authorWeights, "authorWeights");
        if (authors.length != authorWeights.length)
            throw new ContractError(
                "Number of authors is not equal to number of author weights.");
        for (let i = 0; i < authors.length; i++)
            assertString(authors[i], `authors[${i}]`);
        for (let i = 0; i < authorWeights.length; i++)
            assertNumber(authorWeights[i], `authorWeights[${i}]`);
        return new PublishPaperInput(
            paperURL, paperSymbol, publishTimestamp, authors, authorWeights);
    }
}

export class OnboardAuthorInput {
    newAuthor: string;

    constructor(newAuthor: string) {
        this.newAuthor = newAuthor;
    }

    static validateInput(newAuthor: string): OnboardAuthorInput {
        assertString(newAuthor, "newAuthor");
        return new OnboardAuthorInput(newAuthor);
    }
}

export class ProposeNetworkChangeInput {
    changes: NetworkChange[];

    constructor(changes: NetworkChange[]) {
        this.changes = changes;
    }



    static validateInput(changes: NetworkChange[]): ProposeNetworkChangeInput {
        assertArray(changes, "changes");
        let change: NetworkChange;
        for (change of changes) {
            assertString(change.changeId, "changeId");
            switch (change.changeId) {
                case NetworkChangeIds.NewAdmin:
                case NetworkChangeIds.RemoveAdmin:
                case NetworkChangeIds.GrantAdminVotingRights:
                case NetworkChangeIds.RevokeAdminVotingRights:
                    assertString(change.data, "data");
                    break;
                case NetworkChangeIds.NewConfig:
                    assertNetworkConfig(change.data);
                    break;
                default:
                    throw new ContractError("changeId was invalid!");
            }
        }
        return new ProposeNetworkChangeInput(changes);
    }
}

export class VoteOnNetworkChangeProposalInput {
    networkChangeId: number;
    vote: boolean;

    constructor(networkChangeId: number, vote: boolean) {
        this.networkChangeId = networkChangeId;
        this.vote = vote;
    }

    static validateInput(networkChangeId: number, vote: boolean):
        VoteOnNetworkChangeProposalInput {
        assertNumber(networkChangeId, "networkChangeId");
        assertBoolean(vote, "vote");
        return new VoteOnNetworkChangeProposalInput(networkChangeId, vote);
    }
}
