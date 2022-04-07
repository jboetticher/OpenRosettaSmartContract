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