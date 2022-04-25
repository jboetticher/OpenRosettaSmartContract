import { RedStoneLogger, SmartWeaveGlobal } from "redstone-smartweave";
import { NetworkState, Trial } from "./types/StateTypes";
import UtilsHandler from "./UtilsHandler";
declare const ContractError;
declare const SmartWeave: SmartWeaveGlobal;

declare const logger: RedStoneLogger;

/**
 * Handles all of the wallet logic.
 */
export default class TribunalHandler {
    state: NetworkState;

    constructor(state: NetworkState) {
        this.state = state;
    }

    /**
     * Creates a tribunal for a specific paperId.
     * @param caller The user creating the tribunal.
     * @param paperId The paperId of the paper a tribunal is being created for.
     * @param evidenceTx The Arweave upload transaction of the first piece of evidence against the paper.
     */
    createTribunal(caller: string, paperId: number, evidenceTx: string) {
        if (paperId in this.state.trials)
            throw new ContractError(`${paperId} is already being validated`);

        // Remove rosetta from user who wants to create the trial.
        const config = this.state.config;
        const amount = config.validationStake + config.juryDutyFee * config.initialJury;
        if (amount >= this.state.wallets[caller].amount)
            throw new ContractError(`${caller} does not have ${amount} rosetta to stake/pay for trial.`);
        this.state.wallets[caller].amount -= amount;
        
        // Creates default trial.
        const trial: Trial = {
            paperId: paperId,
            validatorWallet: caller,
            stakedValidator: config.validationStake,
            jurorStake: 0,
            jurorFees: config.juryDutyFee * config.initialJury,
            trialSize: config.initialJury,
            prosecutionEvidence: [evidenceTx],
            defenseEvidence: [],
            pastVote: [],
            currentVote: [],
            currentJurors: [],
            currentState: "open",
            until: SmartWeave.block.timestamp + config.trialDuration
        };
        this.state.trials[paperId] = trial;
    }
}