/* eslint-disable @typescript-eslint/no-explicit-any */

import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, SmartWeave } from "redstone-smartweave";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";
import { NetworkChangeProposal, NetworkChange, NetworkChangeIds } from "../src/OpenRosetta/types/StateTypes";

describe('Admin: proposeNetworkChange', () => {
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
    let globalState, proposal: NetworkChange[];
    it('should allow an admin to propose a network test.', async () => {
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
            administrators: [newWallets[1].walletAddress],
            nextNetworkChangeId: 0,
            networkChangeProposals: [],
            config: {
                treasuryWallet: "",
                publicationStake: 0,
                knowledgeTokenAuthorMint: 0,
                knowledgeTokenReplicatorMint: 0,
                knowledgeTokenTreasuryMint: 0,
                publicationLockDuration: 0,
                juryDutyStake: 0,
                juryDutyFee: 0,
                initialJury: 0,
                validationStake: 0,
                transactionFee: 0,
                trialDuration: 0,
                minMint: 0,
                currentMint: 0,
                decayRate: 0
            }
        });

        // Attempt to propose a network change.
        contract.connect(newWallets[1].wallet);
        proposal = [
            { changeId: NetworkChangeIds.NewAdmin, data: newWallets[2].walletAddress },
            { changeId: NetworkChangeIds.RevokeAdminVotingRights, data: newWallets[1].walletAddress },
        ];
        await contract.writeInteraction({
            function: 'proposeNetworkChange',
            parameters: { changes: proposal }
        });
        await mineBlock(arweave);

        // View contract state & verify that no changes have been made.
        const { state }: any = await contract.readState();
        const newProposal: NetworkChangeProposal = state.networkChangeProposals[0];
        expect(newProposal.outcome).toBeFalsy();
        expect(newProposal.votingActive).toBeTruthy();
        expect(newProposal.changes[0].changeId).toBe(proposal[0].changeId);
        expect(newProposal.changes[0].data).toBe(proposal[0].data);
        expect(newProposal.changes[1].changeId).toBe(proposal[1].changeId);
        expect(newProposal.changes[1].data).toBe(proposal[1].data);
        expect(state.nextNetworkChangeId).toBe(1);
        globalState = state;
    });

    it('should fail with a faulty changeId.', async () => {
        // Attempt to propose a faulty network change.
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'proposeNetworkChange',
            parameters: {
                changes: [
                    { changeId: NetworkChangeIds.NewAdmin, data: newWallets[2].walletAddress },
                    { changeId: "FAULTY ID", data: newWallets[1].walletAddress },
                ]
            }
        });
        await mineBlock(arweave);

        // Check to ensure that no new proposal has been made.
        const { state }: any = await contract.readState();
        const nonexistantProposal = state.networkChangeProposals[1];
        expect(nonexistantProposal).toBeUndefined();
    });

    it('should fail with a non-admin address.', async () => {
        // Attempt to propose a network change as a "participant."
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'proposeNetworkChange',
            parameters: {
                changes: [
                    { changeId: NetworkChangeIds.NewAdmin, data: newWallets[2].walletAddress },
                ]
            }
        });
        await mineBlock(arweave);

        // Check to ensure that no new proposal has been made.
        const { state }: any = await contract.readState();
        const nonexistantProposal = state.networkChangeProposals[1];
        expect(nonexistantProposal).toBeUndefined();
    });

    it('should fail with faulty address data.', async () => {
        // Attempt to propose a network change.
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'proposeNetworkChange',
            parameters: {
                changes: [
                    { changeId: NetworkChangeIds.NewAdmin, data: 357 },
                    {
                        changeId: NetworkChangeIds.RevokeAdminVotingRights, data: {
                            item: "is faulty"
                        }
                    },
                ]
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that no changes have been made.
        const { state }: any = await contract.readState();
        const nonexistantNewProposal = state.networkChangeProposals[1];
        expect(nonexistantNewProposal).toBeUndefined();
    });

    it('should fail with missing network config data.', async () => {
        // Attempt to propose a network change.
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'proposeNetworkChange',
            parameters: {
                changes: [
                    {
                        changeId: NetworkChangeIds.NewConfig, 
                        data: {
                            treasuryWallet: "",
                            publicationStake: 0,
                            knowledgeTokenAuthorMint: 0,
                            knowledgeTokenReplicatorMint: 0,
                            knowledgeTokenTreasuryMint: 0,
                            publicationLockDuration: 0,
                            juryDutyStake: 0,
                            juryDutyFee: 0,
                            initialJury: 0,
                            validationStake: 0,
                            transactionFee: 0,
                            trialDuration: 0,
                            //minMint: 0, removed for the test
                            currentMint: 0,
                            decayRate: 0
                        }
                    }
                ]
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that no changes have been made.
        const { state }: any = await contract.readState();
        const nonexistantNewProposal = state.networkChangeProposals[1];
        expect(nonexistantNewProposal).toBeUndefined();
    });

    it('should fail with faulty (wrong value) network config data.', async () => {
        // Attempt to propose a network change.
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'proposeNetworkChange',
            parameters: {
                changes: [
                    {
                        changeId: NetworkChangeIds.NewConfig, 
                        data: {
                            treasuryWallet: "",
                            publicationStake: 0,
                            knowledgeTokenAuthorMint: 0,
                            knowledgeTokenReplicatorMint: 0,
                            knowledgeTokenTreasuryMint: 0,
                            publicationLockDuration: 0,
                            juryDutyStake: 0,
                            juryDutyFee: 0,
                            initialJury: 0,
                            validationStake: 0,
                            transactionFee: "this should be a number",
                            trialDuration: 0,
                            minMint: 0, 
                            currentMint: 0,
                            decayRate: 0
                        }
                    }
                ]
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that no changes have been made.
        const { state }: any = await contract.readState();
        const nonexistantNewProposal = state.networkChangeProposals[1];
        expect(nonexistantNewProposal).toBeUndefined();
    });

    it('should pass when proposing a proper change to network config data.', async () => {
        const newConfig = {
            treasuryWallet: newWallets[1].walletAddress,
            publicationStake: 1000,
            knowledgeTokenAuthorMint: 1500,
            knowledgeTokenReplicatorMint: 100,
            knowledgeTokenTreasuryMint: 384,
            publicationLockDuration: 150000,
            juryDutyStake: 1000,
            juryDutyFee: 1000,
            initialJury: 1000,
            validationStake: 1000,
            transactionFee: 10,
            trialDuration: 1000,
            minMint: 150, 
            currentMint: 10,
            decayRate: 2.45
        };

        // Attempt to propose a network change.
        contract.connect(newWallets[1].wallet);
        await contract.writeInteraction({
            function: 'proposeNetworkChange',
            parameters: {
                changes: [
                    {
                        changeId: NetworkChangeIds.NewConfig, 
                        data: newConfig
                    }
                ]
            }
        });
        await mineBlock(arweave);

        // View contract state & verify that a new config has been proposed
        const { state }: any = await contract.readState();
        const newProposal: NetworkChangeProposal = state.networkChangeProposals[1];
        for(const key in newConfig) {
            expect(newProposal.changes[0].data[key]).toBe(newConfig[key]);
        }
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});
