/* eslint-disable @typescript-eslint/no-explicit-any */

import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, SmartWeave } from "redstone-smartweave";
import { TribunalState } from "../src/OpenRosetta/types/StateTypes";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";

describe('Admin: onboardAuthor', () => {
    let wallet: JWKInterface;
    let arweave: Arweave;
    let arlocal: ArLocal;
    let smartweave: SmartWeave;
    let contractSrc: string;

    beforeAll(async () => {
        const setup: SmartWeaveTestSuite = await testSetup();
        wallet = setup.wallet;
        arweave = setup.arweave;
        arlocal = setup.arlocal;
        smartweave = setup.smartweave;
        contractSrc = setup.contractSrc;
    });

    async function deployContract(initialState) {
        const contractTx = await smartweave.createContract.deploy({
            wallet,
            initState: JSON.stringify(initialState),
            src: contractSrc,
        });
        await mineBlock(arweave);
        const contract = smartweave.contract(contractTx);
        return contract;
    }

    const newWallets: ({ wallet: JWKInterface; walletAddress: string; })[] = [];
    let contract: Contract<any>;
    const FALSIFICATION_STAKE = 100;
    it('should allow an author to call for a falsification tribunal.', async () => {
        // Create 4 wallets
        for (let i = 0; i < 5; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        for (const w of newWallets)
            walletBalances[w.walletAddress] = {
                amount: 1000, role: 100
            };
        walletBalances[newWallets[3].walletAddress].role = 0;
        walletBalances[newWallets[4].walletAddress].amount = 50;

        // Deploy contract
        contract = await deployContract({
            wallets: walletBalances,
            papers: {
                0: {
                    authors: ['author-1', 'author-2'],
                    invalidated: false,
                    replicationRosettaPool: [100, 60, 40],
                    replicationReservedTokens: 1000
                },
                1: {
                    authors: ['author-1', 'author-2'],
                    invalidated: false,
                    replicationRosettaPool: [100, 60, 40],
                    replicationReservedTokens: 1000
                }
            },
            trials: [],
            config: {
                falsificationStake: FALSIFICATION_STAKE,
                juryDutyFee: 10,
                initialJury: 3,
                trialDuration: 10000,
            }
        });

        // Attempt the falsification
        const activeWallet = newWallets[0];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'createFalsificationTribunal',
            parameters: {
                paperId: 0,
                evidenceTx: 'EVIDENCE-TX'
            }
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        // Expect changes
        expect(state.trials[0]).toBeDefined();
        const curTrial = state.trials[0];
        expect(curTrial).toBeDefined();
        expect(curTrial.paperId).toBe(0);
        expect(curTrial.validatorWallet).toBe(activeWallet.walletAddress);
        expect(curTrial.validationStake).toBe(FALSIFICATION_STAKE);
        expect(curTrial.jurorFees).toBe(30);
        expect(curTrial.trialSize).toBe(3);
        expect(curTrial.currentState).toBe(TribunalState.PreJury);
        expect(curTrial.prosecutionEvidence).toBeDefined();
        expect(curTrial.prosecutionEvidence.length).toBe(1);
        expect(curTrial.prosecutionEvidence[0]).toBe('EVIDENCE-TX');
        expect(curTrial.defenseEvidence).toBeDefined();
        expect(state.wallets[activeWallet.walletAddress].amount)
            .toBe(1000 - FALSIFICATION_STAKE - 30)
    });

    it('should not allow an author to start a tribunal if one already exists for a paper.', async () => {
        const activeWallet = newWallets[0];
        contract.connect(activeWallet.wallet);
        const result = await contract.dryWrite({
            function: 'createFalsificationTribunal',
            parameters: {
                paperId: 0,
                evidenceTx: 'EVIDENCE-TX'
            }
        });
        expect(result.type).toBe('error');
    });

    it('should not allow a participant to start a tribunal.', async () => {
        const activeWallet = newWallets[3];
        contract.connect(activeWallet.wallet);
        const result = await contract.dryWrite({
            function: 'createFalsificationTribunal',
            parameters: {
                paperId: 1,
                evidenceTx: 'EVIDENCE-TX'
            }
        });
        expect(result.type).toBe('error');
    });

    it('should not allow an author without enough Rosetta to start a tribunal.', async () => {
        const activeWallet = newWallets[4];
        contract.connect(activeWallet.wallet);
        const result = await contract.dryWrite({
            function: 'createFalsificationTribunal',
            parameters: {
                paperId: 1,
                evidenceTx: 'EVIDENCE-TX'
            }
        });
        expect(result.type).toBe('error');
    });

    it('should allow for multiple active tribunals for multiple papers.', async () => {
        const activeWallet = newWallets[1];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'createFalsificationTribunal',
            parameters: {
                paperId: 1,
                evidenceTx: 'EVIDENCE-TX-2'
            }
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        // Expect changes
        console.log(state.trials);
        expect(state.trials[0]).toBeDefined();
        expect(state.trials[1]).toBeDefined();
        const curTrial = state.trials[1];
        expect(curTrial).toBeDefined();
        expect(curTrial.paperId).toBe(1);
        expect(curTrial.validatorWallet).toBe(activeWallet.walletAddress);
        expect(curTrial.validationStake).toBe(FALSIFICATION_STAKE);
        expect(curTrial.jurorFees).toBe(30);
        expect(curTrial.trialSize).toBe(3);
        expect(curTrial.currentState).toBe(TribunalState.PreJury);
        expect(curTrial.prosecutionEvidence).toBeDefined();
        expect(curTrial.prosecutionEvidence.length).toBe(1);
        expect(curTrial.prosecutionEvidence[0]).toBe('EVIDENCE-TX-2');
        expect(curTrial.defenseEvidence).toBeDefined();
        expect(state.wallets[activeWallet.walletAddress].amount)
            .toBe(1000 - FALSIFICATION_STAKE - 30)
    });


    afterAll(async () => {
        await arlocal.stop();
    });
});
