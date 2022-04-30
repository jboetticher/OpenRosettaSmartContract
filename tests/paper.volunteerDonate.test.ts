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

    it('should allow a user to volunteer rosetta for paper falsification.', async () => {
        // Create 3 wallets.
        for (let i = 0; i < 3; i++) newWallets.push(await createNewWallet(arweave));

        // Creates a state with 1000 in each wallet.
        const walletBalances = {};
        walletBalances[newWallets[0].walletAddress] =
            { amount: 1000, role: 100, knowledgeTokens: [] };
        walletBalances[newWallets[1].walletAddress] =
            { amount: 1000, role: 1, knowledgeTokens: [] };
        walletBalances[newWallets[2].walletAddress] =
            { amount: 1000, role: -1, knowledgeTokens: [] };

        contract = await deployContract({
            wallets: walletBalances,
            nextPaperId: 0,
            papers: {
                0: {
                    extraFalsificationPool: 100,
                    invalidated: false,
                    replicationCount: 0,
                    replicationRosettaPool: [1000, 500, 250]
                },
                1: {
                    extraFalsificationPool: 0,
                    invalidated: false,
                    replicationCount: 2,
                    replicationRosettaPool: [1000, 500, 250]
                },
                2: {
                    extraFalsificationPool: 0,
                    invalidated: false,
                    replicationCount: 5,
                    replicationRosettaPool: [1000, 500, 250]
                },
                3: {
                    extraFalsificationPool: 0,
                    invalidated: true,
                    replicationCount: 2,
                    replicationRosettaPool: [1000, 500, 250]
                }
            }
        });

        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'volunteerFalsificationDonate',
            parameters: {
                paperId: 0,
                amount: 100
            }
        });
        await mineBlock(arweave);

        // Read state
        const { state }: any = await contract.readState();
        expect(state.papers[0]).toBeDefined();
        expect(state.papers[0].extraFalsificationPool).toBe(200);
        expect(state.wallets[newWallets[0].walletAddress].amount).toBe(900);
    });

    it('should not allow a user to volunteer more rosetta than they have for paper falsification.', async () => {
        contract.connect(newWallets[0].wallet);
        const result = await contract.dryWrite({
            function: 'volunteerFalsificationDonate',
            parameters: {
                paperId: 0,
                amount: 1000,
            }
        });
        expect(result.type).toBe('error');
    });

    it('should not allow a user to volunteer more rosetta than they have for paper replication.', async () => {
        contract.connect(newWallets[0].wallet);
        const result = await contract.dryWrite({
            function: 'volunteerReplicationDonation',
            parameters: {
                paperId: 0,
                amount: 1000,
                pool: 2
            }
        });
        expect(result.type).toBe('error');
    });

    it('should not allow a user to donate to a used replication pool.', async () => {
        contract.connect(newWallets[0].wallet);
        const result = await contract.dryWrite({
            function: 'volunteerReplicationDonation',
            parameters: {
                paperId: 1,
                amount: 100,
                pool: 1
            }
        });
        expect(result.type).toBe('error');
    });

    it('should allow a user to donate to a replication pool.', async () => {
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'volunteerReplicationDonation',
            parameters: {
                paperId: 1,
                amount: 100,
                pool: 2
            }
        });
        await mineBlock(arweave);

        // Read state
        const { state }: any = await contract.readState();
        expect(state.papers[1]).toBeDefined();
        expect(state.papers[1].replicationRosettaPool[2]).toBe(350);
        expect(state.wallets[newWallets[1].walletAddress].amount).toBe(900);
    });

    it('should not allow a user to donate to a pool above 3.', async () => {
        contract.connect(newWallets[0].wallet);
        let result = await contract.dryWrite({
            function: 'volunteerReplicationDonation',
            parameters: {
                paperId: 0,
                amount: 100,
                pool: 3
            }
        });
        expect(result.type).toBe('error');
        result = await contract.dryWrite({
            function: 'volunteerReplicationDonation',
            parameters: {
                paperId: 2,
                amount: 100,
                pool: 5
            }
        });
        expect(result.type).toBe('error');
    });

    it("should not allow a user to donate to an invalidated paper's falsification pool.", async () => {
        contract.connect(newWallets[0].wallet);
        const result = await contract.dryWrite({
            function: 'volunteerFalsificationDonate',
            parameters: {
                paperId: 3,
                amount: 100,
            }
        });
        expect(result.type).toBe('error');
    });

    it("should not allow a user to donate to an invalidated paper's replication pool.", async () => {
        contract.connect(newWallets[0].wallet);
        const result = await contract.dryWrite({
            function: 'volunteerReplicationDonation',
            parameters: {
                paperId: 3,
                amount: 100,
                pool: 2
            }
        });
        expect(result.type).toBe('error');
    });

    it('should not allow a banned user to donate to a pool.', async () => {
        contract.connect(newWallets[2].wallet);
        let result = await contract.dryWrite({
            function: 'volunteerReplicationDonation',
            parameters: {
                paperId: 0,
                amount: 100,
                pool: 1
            }
        });
        expect(result.type).toBe('error');
        result = await contract.dryWrite({
            function: 'volunteerFalsificationDonate',
            parameters: {
                paperId: 0,
                amount: 100
            }
        });
        expect(result.type).toBe('error');
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});
