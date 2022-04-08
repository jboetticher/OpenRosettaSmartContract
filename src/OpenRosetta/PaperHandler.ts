import { NetworkState, RosettaWallet } from "./types/StateTypes";
declare const ContractError;

/**
 * Handles all of the paper publishing & administration logic.
 */
export default class PaperHandler {
    state: NetworkState;

    constructor(state: NetworkState) {
        this.state = state;
    }

    publishPaper(creator: string, authors: string[]) {
        if (!(creator in this.state.wallets))
            throw new ContractError("The caller has no wallet");
        const creatorWallet = this.state.wallets[creator];
        
        /* Do something with the determining each author's weight
        let totalweight = 0
        action.input.authorweight.forEach((value) => {
            totalweight += value.weight
        })
        */

        const tokensforauthors = this.state.config.papertokenmint * 1984;
        const tokensforreplication = (1984 - tokensforauthors) * this.state.config.publictokenreplication;
        const tokensfortreasury = 1984 - tokensforreplication - tokensforauthors;

    }
}