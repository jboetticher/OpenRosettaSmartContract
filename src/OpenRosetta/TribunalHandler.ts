import { RedStoneLogger, SmartWeaveGlobal } from "redstone-smartweave";
import { FalsificationTrial, NetworkState, Trial, TribunalState } from "./types/StateTypes";
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
     * @param validatorStake The amount of Rosetta the caller (validator) must stake against the trial.
     */
    createTribunal(caller: string, paperId: number, validatorStake: number) {
        /**
         * NOTE: the previous developer designed trials as a one-at-a-time per paper system.
         * An issue may occur where one malicious trial keeps getting hit with a faulty validation 
         * instead of a falsification, administratively jamming the system. Of course, the malicious
         * actor will have to keep paying the Rosetta fee.
         * I'm still keeping this system, since it will reduce the size of the state and is
         * more efficient to implement.
         */
        if (paperId in this.state.trials)
            throw new ContractError(`${paperId} is already being validated`);

        // Remove rosetta from user who wants to create the trial.
        const config = this.state.config;
        const amount = validatorStake + config.juryDutyFee * config.initialJury;
        if (amount >= this.state.wallets[caller].amount)
            throw new ContractError(`${caller} does not have ${amount} rosetta to stake/pay for trial.`);
        this.state.wallets[caller].amount -= amount;
        
        // Creates default trial.
        const trial: Trial = {
            paperId: paperId,
            validatorWallet: caller,
            validationStake: validatorStake,
            jurorStake: 0,
            jurorFees: config.juryDutyFee * config.initialJury,
            trialSize: config.initialJury,
            pastVote: [],
            currentVote: [],
            currentJurors: [],
            currentState: TribunalState.Appealed,
            until: SmartWeave.block.timestamp + config.trialDuration
        };
        this.state.trials[paperId] = trial;
    }

    /**
     * Creates a tribunal for the falsification of a paper.
     * @param caller The user creating the tribunal.
     * @param paperId The paperId of the paper a tribunal is being created for.
     * @param evidenceTx The amount of Rosetta the caller (validator) must stake against the trial.
     */
    createFalsificationTribunal(caller: string, paperId: number, evidenceTx: string) {
        this.createTribunal(caller, paperId, this.state.config.falsificationStake);
        const trial: FalsificationTrial = (this.state.trials[paperId] as FalsificationTrial);
        trial.prosecutionEvidence = [evidenceTx];
        trial.defenseEvidence = [];
    }
}