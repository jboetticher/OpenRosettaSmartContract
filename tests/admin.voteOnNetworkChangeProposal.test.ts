/* eslint-disable @typescript-eslint/no-explicit-any */

import ArLocal from "arlocal";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, SmartWeave } from "redstone-smartweave";
import testSetup, { createNewWallet, mineBlock, SmartWeaveTestSuite } from "./testSetup";
import { NetworkChangeProposal, NetworkChange, NetworkChangeIds, NetworkConfig } from "../src/OpenRosetta/types/StateTypes";

describe('Admin: proposeNetworkChange', () => {
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
    const proposalConfigChange: NetworkConfig = {
        treasuryWallet: "TEST TREASURY WALLET",
        publicationStake: 1000,
        knowledgeTokenAuthorMint: 1500,
        knowledgeTokenReplicatorMint: 100,
        knowledgeTokenTreasuryMint: 384,
        publicationLockDuration: 150000,
        juryDutyStake: 1000,
        juryDutyFee: 1000,
        initialJury: 1000,
        validationStake: 1000,
        falsificationStake: 1000,
        transactionFee: 10,
        settlementDuration: 200,
        juryDuration: 1000,
        minMint: 150,
        currentMint: 10,
        decayRate: 2.45
    };
    it('should allow an admin to vote on a network change.', async () => {
        // Create eleven wallets.
        const walletBalances = {};
        const administrators = {};
        for (let i = 0; i < 10; i++) {
            newWallets.push(await createNewWallet(arweave));
            walletBalances[newWallets[i].walletAddress] = { amount: 1000, role: 65000 };
            administrators[newWallets[i].walletAddress] = { canVote: true };
        }
        newWallets.push(await createNewWallet(arweave));
        walletBalances[newWallets[10].walletAddress] = { amount: 1000, role: 1 };

        function createDefaultNetworkChangeProposal(changes: NetworkChange[]):
            NetworkChangeProposal {
            return {
                votes: [],
                votingActive: true,
                votingEnded: 0,
                outcome: false,
                created: 0,
                changes: changes
            };
        }

        // Deploys a contract with a few network change proposals
        contract = await deployContract({
            wallets: walletBalances,
            administrators: administrators,
            nextNetworkChangeId: 6,
            networkChangeProposals: [
                createDefaultNetworkChangeProposal([
                    {
                        changeId: NetworkChangeIds.RevokeAdminVotingRights,
                        data: newWallets[9].walletAddress
                    }
                ]),
                createDefaultNetworkChangeProposal([
                    {
                        changeId: NetworkChangeIds.RevokeAdminVotingRights,
                        data: newWallets[9].walletAddress
                    }
                ]),
                createDefaultNetworkChangeProposal([
                    {
                        changeId: NetworkChangeIds.GrantAdminVotingRights,
                        data: newWallets[9].walletAddress
                    }
                ]),
                createDefaultNetworkChangeProposal([
                    {
                        changeId: NetworkChangeIds.RemoveAdmin,
                        data: newWallets[9].walletAddress
                    }
                ]),
                createDefaultNetworkChangeProposal([
                    {
                        changeId: NetworkChangeIds.NewAdmin,
                        data: newWallets[9].walletAddress
                    }
                ]),
                createDefaultNetworkChangeProposal([
                    {
                        changeId: NetworkChangeIds.NewConfig,
                        data: proposalConfigChange
                    }
                ]),
                createDefaultNetworkChangeProposal([
                    {
                        changeId: NetworkChangeIds.NewAdmin,
                        data: newWallets[10].walletAddress
                    },
                    {
                        changeId: NetworkChangeIds.RemoveAdmin,
                        data: newWallets[8].walletAddress
                    },
                    {
                        changeId: NetworkChangeIds.RevokeAdminVotingRights,
                        data: newWallets[9].walletAddress
                    },
                ]),
            ],
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
                juryDuration: 0,
                minMint: 0,
                currentMint: 0,
                decayRate: 0
            }
        });

        // Attempt to vote on a network change.
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'voteOnNetworkChangeProposal',
            parameters: { networkChangeId: 0, vote: false }
        });
        await mineBlock(arweave);

        // View contract state & verify that the vote has been registered.
        const { state }: any = await contract.readState();

        const proposal: NetworkChangeProposal = state.networkChangeProposals[0];
        expect(proposal.votes.length).toBe(1);
        expect(proposal.votingActive).toBeTruthy();
        expect(proposal.votes[0].vote).toBeFalsy();
    });

    it('should not allow a non administrator to vote.', async () => {
        // Attempt to vote on a network change from a non admin wallet.
        contract.connect(newWallets[10].wallet);
        await contract.writeInteraction({
            function: 'voteOnNetworkChangeProposal',
            parameters: { networkChangeId: 0, vote: true }
        });
        await mineBlock(arweave);

        // Assert that the vote has not been added.
        const { state }: any = await contract.readState();
        expect(state.networkChangeProposals[0].votes.length).toBe(1);
    });

    it('should properly end a proposal when it fails.', async () => {
        // Vote 4 more times to get to the 50% mark.
        // 50% should be enough to fail.
        for (let i = 1; i <= 5; i++) {
            contract.connect(newWallets[i].wallet);
            await contract.writeInteraction({
                function: 'voteOnNetworkChangeProposal',
                parameters: { networkChangeId: 0, vote: false }
            });
        }
        await mineBlock(arweave);

        // Check to make sure that the votes have all been registered properly.
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[0];
        expect(proposal.votes.length).toBe(5);
        for (let i = 0; i < 5; i++)
            expect(proposal.votes[i].vote).toBeFalsy();

        // Check vote data
        expect(proposal.outcome).toBeFalsy();
        expect(proposal.votingActive).toBeFalsy();
        expect(proposal.votingEnded).toBeGreaterThan(proposal.created);

        // Check to make sure that the change wasn't made.
        expect(state.administrators[newWallets[9].walletAddress].canVote).toBeTruthy();
    });

    it('should not allow someone to vote on an inactive proposal.', async () => {
        // Attempt to vote on the proposal that just failed.
        contract.connect(newWallets[8].wallet);
        await contract.writeInteraction({
            function: 'voteOnNetworkChangeProposal',
            parameters: { networkChangeId: 0, vote: true }
        });
        await mineBlock(arweave);

        // Check to make sure that an additional vote has not been made.
        const { state }: any = await contract.readState();
        expect(state.networkChangeProposals[0].votes.length).toBe(5);
    });

    it('should properly apply a voting rights removal when it succeeds.', async () => {
        // Vote 6 times to get over the 50% mark.
        for (let i = 0; i <= 6; i++) {
            contract.connect(newWallets[i].wallet);
            await contract.writeInteraction({
                function: 'voteOnNetworkChangeProposal',
                parameters: { networkChangeId: 1, vote: true }
            });
        }
        await mineBlock(arweave);

        // Check votes
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[1];
        expect(proposal.votes.length).toBe(6);
        for (let i = 0; i < 6; i++)
            expect(proposal.votes[i].vote).toBeTruthy();

        // Check that the proposal data.
        expect(proposal.outcome).toBeTruthy();
        expect(proposal.votingActive).toBeFalsy();
        expect(proposal.votingEnded).toBeGreaterThan(proposal.created);

        // Check to make sure that the change was made
        expect(state.administrators[newWallets[9].walletAddress].canVote).toBeFalsy();

        // NOTE: now that there is one less administrator that can vote, proposals
        //       should pass with only 9 votes.
    });

    it('should not allow an administrator without voting rights to vote.', async () => {
        contract.connect(newWallets[9].wallet);
        await contract.writeInteraction({
            function: 'voteOnNetworkChangeProposal',
            parameters: { networkChangeId: 2, vote: true }
        });
        await mineBlock(arweave);

        // Check that vote has not been registered
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[2];
        expect(proposal.votes.length).toBe(0);
    });

    it('should allow a voter to change their vote without adding an extra vote.', async () => {
        contract.connect(newWallets[0].wallet);
        await contract.writeInteraction({
            function: 'voteOnNetworkChangeProposal',
            parameters: { networkChangeId: 2, vote: false }
        });
        await mineBlock(arweave);

        // Check that vote has been registered
        {
            const { state }: any = await contract.readState();
            const proposal: NetworkChangeProposal = state.networkChangeProposals[2];
            expect(proposal.votes.length).toBe(1);
            expect(proposal.votes[0].vote).toBeFalsy();
        }

        // Try to change vote.
        await contract.writeInteraction({
            function: 'voteOnNetworkChangeProposal',
            parameters: { networkChangeId: 2, vote: true }
        });
        await mineBlock(arweave);

        // Check that vote has been changed
        {
            const { state }: any = await contract.readState();
            const proposal: NetworkChangeProposal = state.networkChangeProposals[2];
            expect(proposal.votes.length).toBe(1);
            expect(proposal.votes[0].vote).toBeTruthy();
        }
    });

    it('should properly apply a voting rights approval when it succeeds.', async () => {
        // Vote 5 times to get over the 50% mark.
        const proposalId = 2;
        for (let i = 0; i < 5; i++) {
            contract.connect(newWallets[i].wallet);
            await contract.writeInteraction({
                function: 'voteOnNetworkChangeProposal',
                parameters: { networkChangeId: proposalId, vote: true }
            });
        }
        await mineBlock(arweave);

        // Check votes
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[proposalId];
        expect(proposal.votes.length).toBe(5);
        for (let i = 0; i < 5; i++)
            expect(proposal.votes[i].vote).toBeTruthy();

        // Check that the proposal data.
        expect(proposal.outcome).toBeTruthy();
        expect(proposal.votingActive).toBeFalsy();
        expect(proposal.votingEnded).toBeGreaterThan(proposal.created);

        // Check to make sure that the change was made
        expect(state.administrators[newWallets[9].walletAddress].canVote).toBeTruthy();
    });

    it('should properly apply an admin removal when it succeeds.', async () => {
        // Vote 6 times to get over the 50% mark.
        const proposalId = 3;
        for (let i = 0; i < 6; i++) {
            contract.connect(newWallets[i].wallet);
            await contract.writeInteraction({
                function: 'voteOnNetworkChangeProposal',
                parameters: { networkChangeId: proposalId, vote: true }
            });
        }
        await mineBlock(arweave);

        // Check votes
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[proposalId];
        expect(proposal.votes.length).toBe(6);
        for (let i = 0; i < 6; i++)
            expect(proposal.votes[i].vote).toBeTruthy();

        // Check that the proposal data.
        expect(proposal.outcome).toBeTruthy();
        expect(proposal.votingActive).toBeFalsy();
        expect(proposal.votingEnded).toBeGreaterThan(proposal.created);

        // Check to make sure that the change was made
        expect(state.administrators[newWallets[9].walletAddress]).toBeUndefined();
        expect(state.wallets[newWallets[9].walletAddress].role).toBe(0);
    });

    it('should properly apply an admin addition when it succeeds.', async () => {
        // Vote 5 times to get over the 50% mark.
        const proposalId = 4;
        for (let i = 0; i < 5; i++) {
            contract.connect(newWallets[i].wallet);
            await contract.writeInteraction({
                function: 'voteOnNetworkChangeProposal',
                parameters: { networkChangeId: proposalId, vote: true }
            });
        }
        await mineBlock(arweave);

        // Check votes
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[proposalId];
        expect(proposal.votes.length).toBe(5);
        for (let i = 0; i < 5; i++)
            expect(proposal.votes[i].vote).toBeTruthy();

        // Check the proposal data.
        expect(proposal.outcome).toBeTruthy();
        expect(proposal.votingActive).toBeFalsy();
        expect(proposal.votingEnded).toBeGreaterThan(proposal.created);

        // Check to make sure that the change was made
        expect(state.administrators[newWallets[9].walletAddress]).toBeDefined();
        expect(state.administrators[newWallets[9].walletAddress].canVote).toBeTruthy();
        expect(state.wallets[newWallets[9].walletAddress].role).toBeGreaterThan(0);
    });

    it('should properly apply an config change when it succeeds.', async () => {
        // Vote 6 times to get over the 50% mark.
        const proposalId = 5;
        for (let i = 0; i < 6; i++) {
            contract.connect(newWallets[i].wallet);
            await contract.writeInteraction({
                function: 'voteOnNetworkChangeProposal',
                parameters: { networkChangeId: proposalId, vote: true }
            });
        }
        await mineBlock(arweave);

        // Check votes
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[proposalId];
        expect(proposal.votes.length).toBe(6);
        for (let i = 0; i < 6; i++)
            expect(proposal.votes[i].vote).toBeTruthy();

        // Check the proposal data.
        expect(proposal.outcome).toBeTruthy();
        expect(proposal.votingActive).toBeFalsy();
        expect(proposal.votingEnded).toBeGreaterThan(proposal.created);

        // Check to make sure that the config has changed.
        const newConfig: NetworkConfig = state.config;
        for (const key in newConfig) {
            expect(newConfig[key]).toBe(proposalConfigChange[key]);
        }
    });

    it('should not allow someone to vote on a nonexistant proposal.', async () => {
        // Attempt to vote on a nonexistant proposal (100).
        contract.connect(newWallets[8].wallet);
        await contract.writeInteraction({
            function: 'voteOnNetworkChangeProposal',
            parameters: { networkChangeId: 100, vote: true }
        });
        await mineBlock(arweave);

        // Check to make sure that the vote hasn't been registered.
        const { state }: any = await contract.readState();
        expect(state.networkChangeProposals[100]).toBeUndefined();
    });

    let globalState;
    it('should not have an issue passing a resolution with a mixture of votes.', async () => {
        // Vote 10 times.
        const proposalId = 6;
        for (let i = 0; i < 10; i++) {
            contract.connect(newWallets[i].wallet);
            await contract.writeInteraction({
                function: 'voteOnNetworkChangeProposal',
                parameters: { networkChangeId: proposalId, vote: i > 3 }
            });
            await mineBlock(arweave);
        }

        // Check votes
        const { state }: any = await contract.readState();
        const proposal: NetworkChangeProposal = state.networkChangeProposals[proposalId];
        expect(proposal.votes.length).toBe(10);
        for (let i = 0; i < 4; i++)
            expect(proposal.votes[i].vote).toBeFalsy();
        for (let i = 4; i < 10; i++)
            expect(proposal.votes[i].vote).toBeTruthy();

        // Check the proposal data.
        expect(proposal.outcome).toBeTruthy();
        expect(proposal.votingActive).toBeFalsy();
        expect(proposal.votingEnded).toBeGreaterThan(proposal.created);
        globalState = state;
    });

    it('should apply multiple changes from a single proposal.', async () => {
        expect(globalState.administrators[newWallets[10].walletAddress]).toBeDefined();
        expect(globalState.administrators[newWallets[10].walletAddress].canVote).toBeTruthy();

        expect(globalState.administrators[newWallets[8].walletAddress]).toBeUndefined();
        expect(globalState.wallets[newWallets[8].walletAddress].role).toBe(0);

        expect(globalState.administrators[newWallets[9].walletAddress].canVote).toBeFalsy();
    });

    afterAll(async () => {
        await arlocal.stop();
    });
});
