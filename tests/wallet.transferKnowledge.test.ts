/* eslint-disable @typescript-eslint/no-explicit-any */
import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, SmartWeave } from "redstone-smartweave";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";

describe('Wallet: transferKnowledge', () => {
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
    it('should allow two users to transfer knowledgeTokens that they both own.', async () => {
        // Create two wallets.
        for (let i = 0; i < 2; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        walletBalances[newWallets[0].walletAddress] =
        {
            amount: 500,
            knowledgeTokens: {
                0: { amount: 50 },
                1: { amount: 100 },
                3: { amount: 200 },
                5: { amount: 50 },
            }
        };
        walletBalances[newWallets[1].walletAddress] =
        {
            amount: 500,
            knowledgeTokens: {
                0: { amount: 50 },
                1: { amount: 100 }
            }
        };
        contract = await deployContract({
            wallets: walletBalances
        });

        // Attempt to transfer knowledge tokens.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'transferKnowledge',
            parameters: {
                to: newWallets[1].walletAddress,
                amount: 5,
                paperId: 0
            }
        });
        await mineBlock(arweave);

        // View contract state & verify.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[0].walletAddress].knowledgeTokens[0].amount)
            .toEqual(45);
        expect(state.wallets[newWallets[1].walletAddress].knowledgeTokens[0].amount)
            .toEqual(55);
    });

    it('should not allow a user to transfer more than what they own.', async () => {
        // Attempt to transfer rosetta for a second time.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'transferKnowledge',
            parameters: {
                to: newWallets[1].walletAddress,
                amount: 100,
                paperId: 0
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that nothing has changed.
        const { state }: any = await contract.readState();
        expect(state.wallets[newWallets[0].walletAddress].knowledgeTokens[0].amount)
            .toEqual(45);
        expect(state.wallets[newWallets[1].walletAddress].knowledgeTokens[0].amount)
            .toEqual(55);
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});