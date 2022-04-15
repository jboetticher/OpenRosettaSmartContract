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
    let paperData, globalState;
    let networkConfig: {
        treasuryWallet?: string; publicationStake?: number;
        knowledgeTokenAuthorMint?: number; knowledgeTokenReplicatorMint?: number;
        knowledgeTokenTreasuryMint?: number; publicationLockDuration?: number;
    };
    it('should allow an author to publish a paper.', async () => {
        // Create two wallets.
        for (let i = 0; i < 3; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        walletBalances[newWallets[0].walletAddress] =
            { amount: 1000, role: 100, knowledgeTokens: [], paperStakes: [] };
        walletBalances[newWallets[1].walletAddress] =
            { amount: 1000, role: 1, knowledgeTokens: [] };
        walletBalances[newWallets[2].walletAddress] =
            { amount: 1000, role: 65000, knowledgeTokens: [] };
        networkConfig = {
            treasuryWallet: newWallets[2].walletAddress,
            publicationStake: 50,
            knowledgeTokenAuthorMint: 1500,
            knowledgeTokenReplicatorMint: 100,
            knowledgeTokenTreasuryMint: 384,
            publicationLockDuration: 5000
        };
        contract = await deployContract({
            config: networkConfig,
            wallets: walletBalances,
            nextPaperId: 0,
            papers: []
        });

        // Attempt to publish a new paper.
        paperData = {
            paperURL: "https://google.com/",
            paperSymbol: "PAP",
            publishTimestamp: Date.now(),
            authors: [newWallets[0].walletAddress, newWallets[1].walletAddress],
            authorWeights: [10, 40]
        };
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'publishPaper',
            parameters: paperData
        });
        await mineBlock(arweave);


        // View contract state & verify that a new paper has been made.
        const { state }: any = await contract.readState();
        expect(state.papers[0]).toBeDefined();
        expect(state.papers[0].url).toBe(paperData.paperURL);
        expect(state.papers[0].symbol).toBe(paperData.paperSymbol);
        expect(state.papers[0].publishTimestamp).toBe(paperData.publishTimestamp);
        expect(state.papers[0].invalidated).toBeFalsy();
        globalState = state;
    });

    it('should have the correct amount of tokens distributed.', async () => {
        const state = globalState;
        expect(state.wallets[newWallets[0].walletAddress].amount)
            .toBe(1000 - networkConfig.publicationStake);
        expect(state.wallets[networkConfig.treasuryWallet].knowledgeTokens[0].amount)
            .toBe(networkConfig.knowledgeTokenTreasuryMint);
        expect(state.papers[0].replicationReservedTokens)
            .toBe(networkConfig.knowledgeTokenReplicatorMint);
        const totalWeight = paperData.authorWeights[0] + paperData.authorWeights[1];

        /* Something funky is going on...
          console.log
            [ <1650047040 empty items>, { rosetta: 0, knowledgeToken: 300 } ]
        */

        expect(state.wallets[paperData.authors[0]].knowledgeTokens[0].locked.amount)
            .toBe(networkConfig.knowledgeTokenAuthorMint *
                paperData.authorWeights[0] / totalWeight);
        expect(state.wallets[paperData.authors[1]].knowledgeTokens[0].locked.amount)
            .toBe(networkConfig.knowledgeTokenAuthorMint *
                paperData.authorWeights[1] / totalWeight);
    });


    afterAll(async () => {
        await arlocal.stop();
    });
});
