import { NetworkState } from "./types/StateTypes";
declare const ContractError;

/**
 * Handles all of the wallet logic.
 */
export default class WalletHandler {
    state: NetworkState;

    constructor(state: NetworkState) {
        this.state = state;
    }

    /**
     * Transfers rosetta between users.
     * @param from The wallet to transfer from.
     * @param to The wallet to transfer to.
     * @param amount How much to transfer.
     */
    transfer(from: string, to: string, amount: number): void {
        if (!(from in this.state.wallets))
            throw new ContractError(`Wallet for ${from} does not exist`);
        if (!(to in this.state.wallets))
            throw new ContractError(`Wallet for ${to} does not exist`);

        const frwallet = this.state.wallets[from];
        const towallet = this.state.wallets[to] ;
        
        if (frwallet.amount < amount)
            throw new ContractError(`${from} does not have enough rosetta.`);

        frwallet.amount -= amount
        towallet.amount += amount
    }
}