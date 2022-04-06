declare const ContractError;

export class TransferInput {
    to: string;
    amount: number;
    
    constructor(to: string, amount: number) {
        this.to = to;
        this.amount = amount;
    }

    static validateInput(to, amount) {
        if(typeof(to) != 'string')
            throw new ContractError("Paramater {to} isn't a string.");
        if(typeof(amount) != 'number' || Number.isNaN(amount))
            throw new ContractError("Paramater {amount} isn't a number.");
        return new TransferInput( to, amount );
    }
}