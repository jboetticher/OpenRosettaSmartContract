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
    let paperData;
    it('should allow an author to publish a paper.', async () => {
        // Create two wallets.
        for (let i = 0; i < 3; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        walletBalances[newWallets[0].walletAddress] = { amount: 1000, role: 10 };
        walletBalances[newWallets[1].walletAddress] = { amount: 1000, role: 1 };
        walletBalances[newWallets[2].walletAddress] = { amount: 1000, role: 65000 };
        contract = await deployContract({
            config: {
                treasuryWallet: newWallets[2].walletAddress,
                publicationStake: 50,
                knowledgeTokenAuthorMint: 1500,
                knowledgeTokenReplicatorMint: 100,
                knowledgeTokenTreasuryMint: 384,
                publicationLockDuration: 5000
            },
            wallets: walletBalances
        });

        // Attempt to publish a new paper.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'publishPaper',
            parameters: {
                paperUrl: "https://google.com/",
                paperSymbol: "PAP",
                publishTimestamp: Date.now(),
                authors: [ newWallets[0].walletAddress, newWallets[1].walletAddress ],
                authorWeights: [ 10, 40 ]
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that a new paper has been made.
        // @TODO
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});
