import { RedStoneLogger, SmartWeaveGlobal } from "redstone-smartweave";
import { FalsificationTrial, NetworkState, PaperState, RosettaWallet, Trial, TribunalOutcome, TribunalState, ValidationTrial } from "./types/StateTypes";
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
     * Adds a new juror to the pool of available jurors.
     * @param newJuror The juror who wishes to join the jury pool.
     */
    joinJuryPool(newJuror: string) {
        const wallet: RosettaWallet = this.state.wallets[newJuror];
        const juryStake = this.state.config.juryDutyStake;
        if (wallet.trust < 1)
            throw new ContractError("A juror must have a trust of 1.");
        if (wallet.amount < juryStake)
            throw new ContractError("Not enough Rosetta in wallet to cover jury duty stake.");

        wallet.amount -= juryStake;
        wallet.juryStake += juryStake;
        this.state.juryPool.push(newJuror);
    }

    /**
     * Removes a juror from the pool of available jurors.
     * @param oldJuror The juror to remove from the jury pool.
     */
    leaveJuryPool(oldJuror: string) {
        const jurorIndex = this.state.juryPool.findIndex(x => x === oldJuror);
        if (jurorIndex === -1)
            throw new ContractError("Contract caller was not found in the jury pool.");

        this.state.juryPool.splice(jurorIndex, 1);

        const wallet: RosettaWallet = this.state.wallets[oldJuror];
        wallet.amount += wallet.juryStake;
        wallet.juryStake = 0;
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
        if (paperId in this.state.trials && this.state.trials[paperId].currentState != TribunalState.Closed)
            throw new ContractError(`${paperId} is already being validated`);
        else if (paperId in this.state.trials)
            this.state.pastTrials.push(this.state.trials[paperId]);

        // Remove rosetta from user who wants to create the trial.
        const config = this.state.config;
        const validationCost = validatorStake + config.juryDutyFee * config.initialJury;
        if (validationCost >= this.state.wallets[caller].amount)
            throw new ContractError(`${caller} does not have ${validationCost} rosetta to stake/pay for trial.`);
        this.state.wallets[caller].amount -= validationCost;

        // Creates default trial.
        const trial: Trial = {
            paperId: paperId,
            validator: caller,
            validationStake: validatorStake,
            jurorFees: config.juryDutyFee * config.initialJury,
            trialSize: config.initialJury,
            settlementVotes: [],
            settlementDocuments: [],
            jurorVotes: [],
            jurorDocuments: [],
            currentJurors: [],
            currentState: TribunalState.PreJury,
            outcome: false,
            settlementUntil: SmartWeave.block.timestamp + config.settlementDuration,
            juryUntil: 0
        };
        this.state.trials[paperId] = trial;
    }

    /*  Paper Validation Tribunal Steps

    1.  User wanst to starts tribunal.
        createFalsificationTribunal()
    2.  Tribunal is created, settlement starts.
        a.  Authors & Tribunal vote.
            voteOnTribunalSettlement()
        b.  Settlement is completed or runs out of time, someone calls:
            completeSettlement()
            i.  Settlement is completed.
                END
            ii. Runs out of Time.
                Continue to 3.
    3.  Jury is created.
        4.  Jury deliberates.
        a.  Jury runs out of time. No changes are made, validator gets cost returned.
            END
        b.  Jury decides in favor of validator. Results: ???
    5.  Opened for appeals.

    */

    /**
     * Allows a validator to submit a 
     * @param caller 
     * @param paperId 
     * @param validatingPaperId 
     */
    submitPaperAsValidation(caller: string, paperId: number, validatingPaperId: number) {
        if(!this.state.papers[validatingPaperId].authors.includes(caller))
            throw new ContractError('Only an author of the validating paper can submit it for validation.');
        this.createTribunal(caller, paperId, this.state.config.falsificationStake);
        const trial: ValidationTrial = (this.state.trials[paperId] as ValidationTrial);
        trial.validatingPaperId = validatingPaperId;
    }

    /*  Falsification Tribunal Steps

    1.  User wanst to starts tribunal.
        createFalsificationTribunal()
    2.  Tribunal is created, settlement starts.
        a.  Authors & Tribunal vote.
            voteOnTribunalSettlement()
        b.  Settlement is completed or runs out of time, someone calls:
            completeSettlement()
            i.  Settlement is completed.
                END
            ii. Runs out of Time.
                Continue to 3.
    3.  Jury is created.
    4.  Jury deliberates.
        a.  Jury runs out of time. No changes are made, validator gets cost returned.
            END
        b.  Jury decides in favor of validator. Results: ???
        c.  Jury decides in favor of author. Results ???
    5.  Opened for appeals.



    https://rosetta-2.gitbook.io/rosetta-docs/validation/tribunals#step-1
    createFalsificationTribunal -> STEP 2

    https://rosetta-2.gitbook.io/rosetta-docs/validation/tribunals#step-2
    voteOnTribunalSettlement -> 
        completeSettlement:
            settled? ->     END
            notSettled? ->
                createJury -> STEP 3

    
    */

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

    /**
     * Returns the trial and paper states for a settlement.
     * @param {string} caller The user voting in the settlement.
     * @param {number} paperId The id of the paper on which the tribunal was formed. 
     */
    settlementGetTrialAndPaper(caller: string, paperId: number): { trial: Trial; paper: PaperState; } {
        // Get the trial.
        const trial: Trial = this.state.trials[paperId];
        if (trial === undefined)
            throw new ContractError('No tribunal exists for paper ' + paperId);
        if (trial.currentState !== TribunalState.PreJury)
            throw new ContractError('Cannot vote on tribunal settlement after the prejury step.');

        // Get the paper.
        const paper: PaperState = this.state.papers[paperId];
        if (paperId === undefined)
            throw new ContractError('No paper exists for id ' + paperId);
        if (caller !== trial.validator && !paper.authors.includes(caller))
            throw new ContractError('Only authors and the validator can vote on the tribunal settlement.');

        return { trial, paper };
    }

    /**
     * Allows a user to vote on a trial.
     * @param {string} caller The user voting in the settlement.
     * @param {number} paperId The id of the paper on which the tribunal was formed.
     * @param {TribunalOutcome} vote The direction the user wishes to settle.
     * @param {string} explanation The document that explains the decision.
     */
    async voteOnTribunalSettlement(caller: string, paperId: number, vote: TribunalOutcome, explanation: string): Promise<void> {
        if (vote === TribunalOutcome.Validation)
            throw new ContractError('Cannot settle on validation.');
        const { trial } = this.settlementGetTrialAndPaper(caller, paperId);
        trial.settlementVotes[caller] = vote;
        trial.settlementDocuments[caller] = explanation;

        // Attempt to complete settlement.
        try {
            await this.completeSettlement(caller, paperId);
        }
        catch {
            // Settlement not finished.
        }
    }

    /**
     * Allows a caller to confirm the completion of a settlement.
     * @param {string} caller The person wishing to complete the settlement.
     * @param {number} paperId The id of the paper that is being settled on.
     */
    async completeSettlement(caller: string, paperId: number): Promise<void> {
        // Get the trial & paper.
        const { trial, paper } = this.settlementGetTrialAndPaper(caller, paperId);

        // NOTE: Requires a unanimous decision; this was not documented and was a decision on my part.
        const votes = [];
        let resolution: TribunalOutcome | undefined = undefined;
        try {
            for (const author of paper.authors) {
                if (trial.settlementVotes[author] === undefined)
                    throw new ContractError('Not all authors have decided to settle.');
                votes.push(trial.settlementVotes[author]);
            }
            if (trial.settlementVotes[trial.validator] === undefined)
                throw new ContractError('Validator has not decided to settle.');
            votes.push(trial.settlementVotes[trial.validator]);
            if (votes.length < 2)
                throw new ContractError("Validator &/or author not found.");

            // Check to make sure that they're all the same.
            if (votes.every(x => x === votes[0])) resolution = votes[0];
            else throw new ContractError('No unanimous decision has been made.');
        }
        catch (err) {
            // If time is up, create the jury and go to next step.
            if (SmartWeave.block.timestamp > trial.settlementUntil) {
                trial.juryUntil = SmartWeave.block.timestamp + this.state.config.juryDuration;
                trial.currentJurors = await this.createJury(
                    caller, paperId, this.state.config.initialJury);
                trial.currentState = TribunalState.JuryDeliberation;
                return;
            }
            else throw err;
        }

        // TODO:    Bake in the effects
        //          The docs have yet to describe what the effects are. They're supposed to be
        //          penalties that are less than if the jury were to be called.
        switch (resolution) {
            case TribunalOutcome.NoChanges:
                break;
            case TribunalOutcome.Fraud:
                break;
            case TribunalOutcome.Mistake:
                break;
            case TribunalOutcome.MaliciousActivity:
                break;
            case TribunalOutcome.Validation:
                break;
        }

        trial.currentState = TribunalState.Settlement;
        trial.outcome = resolution;
    }

    /**
     * Checks if a trial is a falsification trial.
     * @param {Trial} trial The trial at hand.
     * @returns {boolean} True if a falsification trial, false if otherwise.
     */
    isFalsificationTrial(trial: Trial): boolean {
        const falsif = trial as FalsificationTrial;
        return falsif.prosecutionEvidence !== undefined && falsif.defenseEvidence !== undefined;
    }

    /**
     * Attempts to create an impartial jury for the paper in question.
     * @param {number} paperId The id of the paper that a jury is needed for.
     * @param {number} jurorCount The amount of jurors to find.
     * @returns an array of juror wallet addresses.
     */
    async createJury(caller: string, paperId: number, jurorCount: number): Promise<string[]> {
        /**
         * NOTE: Documentation requires that the juror cannot hold the paper token, but any author
         * could send a fraction of a paper token to the entire network. 
         * Solution? Remove fractionalized paper tokens. 
         */

        // 1. Sort the juror list into impartial.
        const impartial = [];
        this.state.juryPool.forEach(addr => {
            const wallet: RosettaWallet = this.state.wallets[addr];
            // NOTE:    if the user has never owned, or currently owns 0, they are
            //          marked as impartial. Can be changed to just never owned.
            if (wallet.knowledgeTokens[paperId] === undefined ||
                wallet.knowledgeTokens[paperId].amount === 0)
                impartial.push(addr);
        });

        // 2. Attempt to create a jury.
        const jury = [];
        if (impartial.length < jurorCount) jury.push(...impartial);
        else {
            const hashSeed: number = await UtilsHandler.getRandomIntNumber(100000000000, caller);
            const seed: number = await UtilsHandler.getRandomIntNumber(impartial.length, caller);
            const shuffled = jury.sort(x => UtilsHandler.hashFnv32a(x, hashSeed) % seed);
            jury.push(shuffled.slice(0, jurorCount));
        }

        // 3. Throw an error if no jury can be formed.
        if (jury.length < 3)
            throw new ContractError('Juror has an issue.');
        return jury;
    }

    /**
     * Allows a juror to vote on a trial.
     * @param {string} caller The person wishing to vote as a juror.
     * @param {number} paperId The id of the paper that is being voted on.
     * @param {TribunalOutcome} vote The direction the juror wishes to conclude.
     * @param {string} explanation The explanation of the decision.
     */
    voteAsJuror(caller: string, paperId: number, vote: TribunalOutcome, explanation: string): void {
        // Get the trial.
        const trial: Trial = this.state.trials[paperId];
        if (trial === undefined)
            throw new ContractError('No tribunal exists for paper ' + paperId);
        if (trial.currentState !== TribunalState.JuryDeliberation)
            throw new ContractError('Cannot submit a juror vote if not deliberating.');
        const isFalsification = this.isFalsificationTrial(trial);
        if(isFalsification && vote === TribunalOutcome.Validation)
            throw new ContractError('Cannot vote for validation on a falsification trial.');

        // Ensure the caller is a juror.
        if (!trial.currentJurors.includes(caller))
            throw new ContractError('Cannot submit a juror vote if not a juror.');
        if (SmartWeave.block.timestamp > trial.juryUntil)
            throw new ContractError('Cannot submit a juror vote after jury timeout, please complete trial.');

        // Submit vote to data structure.
        trial.jurorVotes[caller] = vote;
        trial.jurorDocuments[caller] = explanation;

        // Attempt to complete tribunal.
        try {
            this.completeJurorDeliberation(caller, paperId);
        }
        catch {
            // Deliberation not finished.
        }
    }

    completeJurorDeliberation(caller: string, paperId: number) {
        // Get the trial.
        const trial: Trial = this.state.trials[paperId];
        if (trial === undefined)
            throw new ContractError('No tribunal exists for paper ' + paperId);
        if (trial.currentState !== TribunalState.JuryDeliberation)
            throw new ContractError('Cannot vote on tribunal settlement after the prejury step.');

        // Get the paper.
        const paper: PaperState = this.state.papers[paperId];
        if (paperId === undefined)
            throw new ContractError('No paper exists for id ' + paperId);
        if (caller !== trial.validator && !paper.authors.includes(caller))
            throw new ContractError('Only authors and the validator can vote on the tribunal settlement.');

        let allJurorsHaveVoted = true;
        for (const j of trial.currentJurors) {
            if (trial.jurorVotes[j] !== undefined) continue;
            allJurorsHaveVoted = false;
            break;
        }

        // Either all jurors have finished their vote, or time is up.
        if (allJurorsHaveVoted || SmartWeave.block.timestamp > trial.juryUntil) {
            // Find the highest vo
            const entries: [string, TribunalOutcome][] = Object.entries(trial.jurorVotes);

            // If empty, then nothing happens, and everything is returned.
            if (entries.length === 0) {
                // TODO: No changes to the paper made, jurors don't get paid, etc
                this.state.wallets[trial.validator] += trial.validationStake + trial.jurorFees;
                trial.outcome = TribunalOutcome.NoChanges;
                trial.currentState = TribunalState.Closed;
                return;
            }

            // Otherwise, we check for the highest vote.
            else {
                const voteCounts = new Map<TribunalOutcome, number>();
                for (const [, vote] of entries)
                    voteCounts[vote] = voteCounts[vote] ?? 0 + 1;
                const winner =
                    [...voteCounts.entries()].reduce(
                        (x, y) => x[1] > y[1] ? x :     // Choose greatest
                            x[1] != y[1] ? y : 
                                (x[0] < y[0] ? x : y)   // Else choose least severe
                    );

                // Set trial outcome.
                trial.outcome = winner[0];

                // TODO: Bake in effects of the trial
                // TODO: Check for falsification vs validation
                switch (trial.outcome) {
                    case TribunalOutcome.Fraud:
                        paper.invalidated = true;
                        trial.currentState = TribunalState.ClosedWithAppealOption;
                        break;
                    case TribunalOutcome.MaliciousActivity:
                        paper.invalidated = true;
                        trial.currentState = TribunalState.ClosedWithAppealOption;
                        break;
                    case TribunalOutcome.Mistake:
                        paper.invalidated = true;
                        trial.currentState = TribunalState.ClosedWithAppealOption;
                        break;
                    case TribunalOutcome.NoChanges:
                        break;
                    case TribunalOutcome.Validation:
                        break;
                }

                // Find juror minority & majority
                // TODO: change logic for falsification vs validation. Currently assumes no validation
                const charge = trial.outcome !== TribunalOutcome.NoChanges;
                const minority = [], majority = [];
                for(const juror of trial.currentJurors) {
                    if(trial.jurorVotes[juror] === undefined) minority.push(juror);
                    if(charge) {
                        if(trial.jurorVotes[juror] === TribunalOutcome.NoChanges)
                            minority.push(juror);
                        else majority.push(juror);
                    }
                    else {
                        if(trial.jurorVotes[juror] === TribunalOutcome.NoChanges)
                            majority.push(juror);
                        else minority.push(juror);
                    }
                }

                // Apply juror rewards.
                const minorityPenalty = this.state.config.juryMinorityPenalty;
                const jurorsToRemove: string[] = [];
                let totalJurorRewards = trial.jurorFees;
                minority.forEach(addr => { 
                    const wallet = this.state.wallets[addr];
                    if(minorityPenalty >= wallet.juryStake) {
                        jurorsToRemove.push(addr);
                        totalJurorRewards += wallet.juryStake;
                        wallet.juryStake = 0;
                    }
                    else {
                        wallet.juryStake -= minorityPenalty;
                        totalJurorRewards += minorityPenalty;
                    }
                });
                majority.forEach(addr => {
                    this.state.wallets[addr].amount += totalJurorRewards / majority.length;
                });
                if(jurorsToRemove.length > 0) 
                    this.state.juryPool = this.state.juryPool
                        .filter(addr => !jurorsToRemove.includes(addr));

            }
        }
    }

}