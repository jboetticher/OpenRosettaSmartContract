/* eslint-disable @typescript-eslint/no-explicit-any */

import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, SmartWeave } from "redstone-smartweave";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";
import * as Fuzz from "../../SmartWeaveFuzzing";
import { fuzz } from "../../SmartWeaveFuzzing";

describe('Wallet: transfer', () => {
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
    it('should allow two users to transfer rosetta.', async () => {
        // Create four wallets.
        for (let i = 0; i < 4; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        walletBalances[newWallets[0].walletAddress] = { amount: 1000 };
        walletBalances[newWallets[1].walletAddress] = { amount: 1000 };
        walletBalances[newWallets[3].walletAddress] = { amount: 50, role: -1 };
        contract = await deployContract({
            wallets: walletBalances
        });

        // Attempt to transfer rosetta.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'transfer',
            parameters: {
                to: newWallets[1].walletAddress,
                amount: 500
            }
        });
        await mineBlock(arweave);

        // View contract state & verify.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[0].walletAddress].amount).toEqual(500);
        expect(state.wallets[newWallets[1].walletAddress].amount).toEqual(1500);
    });

    it('should not allow a user to transfer more than what they own.', async () => {
        // Attempt to transfer rosetta for a second time.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'transfer',
            parameters: {
                to: newWallets[1].walletAddress,
                amount: 501
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that nothing has changed.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[0].walletAddress].amount).toEqual(500);
        expect(state.wallets[newWallets[1].walletAddress].amount).toEqual(1500);
    });

    it('should allow a user to transfer to a wallet that does not exist yet.', async () => {
        const pre: any = await contract.readState();
        expect(pre.state.wallets[newWallets[2].walletAddress]).toBeUndefined();

        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'transfer',
            parameters: {
                to: newWallets[2].walletAddress,
                amount: 50
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that nothing has changed.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[1].walletAddress].amount).toEqual(1450);
        expect(state.wallets[newWallets[2].walletAddress].amount).toEqual(50);
    });

    it("should not allow someone to transfer to a banned wallet.", async () => {
        const pre: any = await contract.readState();

        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'transfer',
            parameters: {
                to: newWallets[3].walletAddress,
                amount: 10
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that nothing has changed.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[0].walletAddress].amount)
            .toEqual(pre.state.wallets[newWallets[0].walletAddress].amount);
        expect(state.wallets[newWallets[3].walletAddress].amount)
            .toEqual(pre.state.wallets[newWallets[3].walletAddress].amount);
    });

    it("should not allow a banned person to transfer.", async () => {
        const pre: any = await contract.readState();

        contract.connect(newWallets[3].wallet);
        await contract.writeInteraction({
            function: 'transfer',
            parameters: {
                to: newWallets[0].walletAddress,
                amount: 10
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that nothing has changed.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[3].walletAddress].amount)
            .toEqual(pre.state.wallets[newWallets[3].walletAddress].amount);
        expect(state.wallets[newWallets[0].walletAddress].amount)
            .toEqual(pre.state.wallets[newWallets[0].walletAddress].amount);
    });

    /**
     * Fuzzing strategy?
     * 1. Define input, contract, & inital state.
     * 3. Create fuzzing session with fuzz input. Define expectations.
     *      Create some modular/expected fuzzes? Such as "must throw an exception"?
     * 4. Dry run in Arweave.
     */
    fuzz('FUZZ: should not allow a user to transfer more than what they own.', Fuzz.int({ min: 501 }), async (randAddr) => {
        contract.connect(newWallets[0].wallet);
        const result = await contract.dryWrite({
            function: 'onboardAuthor',
            parameters: {
                newAuthor: randAddr
            }
        });
        expect(result.type).toBe('error');
    });

    /*
    Fuzz.test('FUZZ: should allow a user to transfer.', Fuzz.int({ max: 500 }), async (randAddr) => {
        contract.connect(newWallets[0].wallet);
        const result = await contract.dryWrite({
            function: 'onboardAuthor',
            parameters: {
                newAuthor: randAddr
            }
        });
        expect(result.type).toBe('error');
    });*/

    /* Removed behavior. Anyone should be able to recieve or transfer rosettta.
    it('should not allow a user to transfer to a user that has no wallet.', async () => {
        // Create a new random wallet.
        const { walletAddress } = await createNewWallet(arweave);
        
        // Attempt to transfer rosetta to a new wallet.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'transfer',
            parameters: {
                to: walletAddress,
                amount: 1
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that nothing has changed.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[0].walletAddress].amount).toEqual(500);
        expect(state.wallets[walletAddress]).toBeUndefined();
    });
    */

    afterAll(async () => {
        await arlocal.stop();
    });
});
