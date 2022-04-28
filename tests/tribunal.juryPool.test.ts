/* eslint-disable @typescript-eslint/no-explicit-any */

import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, SmartWeave } from "redstone-smartweave";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";

describe('Admin: onboardAuthor', () => {
    let wallet: JWKInterface;
    let arweave: Arweave;
    let arlocal: ArLocal;
    let smartweave: SmartWeave;
    let contractSrc: string;

    jest.setTimeout(30000);

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
    it('should allow an author with 1 trust to join the juror pool.', async () => {
        // Create 5 wallets.
        for (let i = 0; i < 5; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        for (const w of newWallets)
            walletBalances[w.walletAddress] = { 
                amount: 1000, role: 100, juryStake: 0, trust: 1 };
        walletBalances[newWallets[2].walletAddress].trust = 0.9;
        walletBalances[newWallets[3].walletAddress].role = 0;
        walletBalances[newWallets[4].walletAddress].amount = 50;

        // Deploy contract
        contract = await deployContract({
            wallets: walletBalances,
            juryPool: [],
            config: {
                juryDutyStake: 100
            }
        });

        // Add to jury pool (should work).
        const activeWallet = newWallets[0];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'joinJuryPool',
            parameters: {}
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        expect(state.juryPool.length).toBe(1);
        expect(state.juryPool).toContain(activeWallet.walletAddress);
        expect(state.wallets[activeWallet.walletAddress]).toBeDefined();
        expect(state.wallets[activeWallet.walletAddress].amount).toBe(900);
    });

    it('should not allow an author with less than 1 trust to join the juror pool.', async () => {
        // Attempt to add to jury pool.
        const activeWallet = newWallets[2];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'joinJuryPool',
            parameters: {}
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        // Everything should be the same.
        expect(state.juryPool.length).toBe(1);
        expect(state.wallets[activeWallet.walletAddress].amount).toBe(1000);
        expect(state.wallets[activeWallet.walletAddress].juryStake).toBe(0);
    });

    it('should not allow an non author to join the juror pool.', async () => {
        // Attempt to add to jury pool.
        const activeWallet = newWallets[3];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'joinJuryPool',
            parameters: {}
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        // Everything should be the same.
        expect(state.juryPool.length).toBe(1);
        expect(state.wallets[activeWallet.walletAddress].amount).toBe(1000);
        expect(state.wallets[activeWallet.walletAddress].juryStake).toBe(0);
    });

    it('should not allow a non-author with too little funds to join the juror pool.', async () => {
        // Attempt to add to jury pool.
        const activeWallet = newWallets[4];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'joinJuryPool',
            parameters: {}
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        // Everything should be the same.
        expect(state.juryPool.length).toBe(1);
        expect(state.wallets[activeWallet.walletAddress].amount).toBe(50);
        expect(state.wallets[activeWallet.walletAddress].juryStake).toBe(0);
    });

    it('should not allow a non juror to leave the juror pool.', async () => {
        // Attempt to add to jury pool.
        const activeWallet = newWallets[3];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'leaveJuryPool',
            parameters: {}
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        // Everything should be the same.
        expect(state.juryPool.length).toBe(1);
        expect(state.wallets[activeWallet.walletAddress].amount).toBe(1000);
        expect(state.wallets[activeWallet.walletAddress].juryStake).toBe(0);
    });

    it('should allow multiple jurors.', async () => {
        // Add to jury pool (should work).
        const activeWallet = newWallets[1];
        contract.connect(activeWallet.wallet);
        await contract.writeInteraction({
            function: 'joinJuryPool',
            parameters: {}
        });
        await mineBlock(arweave);
        const { state } = await contract.readState();

        expect(state.juryPool.length).toBe(2);
        expect(state.juryPool).toContain(activeWallet.walletAddress);
        expect(state.wallets[activeWallet.walletAddress]).toBeDefined();
        expect(state.wallets[activeWallet.walletAddress].amount).toBe(900);
    });

    it('should allow jurors to leave.', async () => {
        // Attempt to remove both jurors.
        for(let i = 0; i < 2; i++) {
            const activeWallet = newWallets[i];
            contract.connect(activeWallet.wallet);
            await contract.writeInteraction({
                function: 'leaveJuryPool',
                parameters: {}
            });
            await mineBlock(arweave);
            const { state } = await contract.readState();
            console.log(state);
    
            expect(state.juryPool.length).toBe(1 - i);
            expect(state.juryPool).not.toContain(activeWallet.walletAddress);
            expect(state.wallets[activeWallet.walletAddress]).toBeDefined();
            expect(state.wallets[activeWallet.walletAddress].amount).toBe(1000);
        }
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});
