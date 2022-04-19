/* eslint-disable @typescript-eslint/no-explicit-any */

import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, SmartWeave } from "redstone-smartweave";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";

describe('Paper: publishPaper', () => {
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
    let globalState;
    it('should allow an administrator to onboard an author.', async () => {
        // Create two wallets.
        for (let i = 0; i < 3; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        walletBalances[newWallets[0].walletAddress] =
            { amount: 1000, role: 1 };
        walletBalances[newWallets[1].walletAddress] =
            { amount: 1000, role: 65000 };
        walletBalances[newWallets[2].walletAddress] =
            { amount: 1000, role: 1 };
        contract = await deployContract({
            wallets: walletBalances,
            administrators: [newWallets[1].walletAddress]
        });

        // View contract state & verify that the first wallet has role of 1.
        {
            const { state }: any = await contract.readState();
            expect(state.wallets[newWallets[0].walletAddress].role).toBe(1);
            globalState = state;
        }

        // Attempt to publish a new paper.
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'onboardAuthor',
            parameters: {
                newAuthor: newWallets[0].walletAddress
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that they have been onboarded.
        // 100 should be the author permission.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[0].walletAddress].role).toBe(100);
        globalState = state;
    });

    it('should not allow a non-administrator to onboard an author.', async () => {
        // Connect to an author account.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'onboardAuthor',
            parameters: {
                newAuthor: newWallets[2].walletAddress
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that the user is still at role 1.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[2].walletAddress].role).toBe(1);
    });

    it('should not accidentally demote a user.', async () => {
        // Connect to admin account, attempt to onboard admin.
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'onboardAuthor',
            parameters: {
                newAuthor: newWallets[1].walletAddress
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that the user is still an admin.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[1].walletAddress].role).toBe(65000);
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});
