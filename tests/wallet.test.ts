/* eslint-disable @typescript-eslint/no-explicit-any */
import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { SmartWeave } from "redstone-smartweave";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";

describe('Wallet Interactions', () => {
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

    it('should allow two users to transfer rosetta.', async () => {        
        // Create two wallets.
        const newWallets: ({ wallet: JWKInterface; walletAddress: string; })[] = [];
        for (let i = 0; i < 2; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        walletBalances[newWallets[0].walletAddress] = 1000;
        walletBalances[newWallets[1].walletAddress] = 1000;
        const contract = await deployContract({
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
        console.log(state);
        expect(state.wallets[newWallets[0].walletAddress]).toEqual(500);
        expect(state.wallets[newWallets[1].walletAddress]).toEqual(1500);
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});