const rosettalib = {
    /**
     * Scaffolds the default wallet object.
     * See examplewalletstate.json
     */
    defaultWallet: function() {
        return {
            amount: 0,
            staked: 0,
            paperstakes: {},
            locked: {},
            knowledgetokens: {},
            trials: []
        }
    },

    /**
     * Scaffolds the default knowledge wallet, within the wallet object.
     * See examplewalletstate.json
     */
    defaultKnowledgeWallet: function() {
        return {
            amount: 0,
            locked: []
        }
    },

    /**
     * Scaffolds a locked knowledge object, within the knowledge wallet object.
     * See examplewalletstate.json
     */
    defaultlockedknowledge: function(amount) {
        return {
            rosetta: 0,
            knowledge: amount
        }
    },

    /**
     * Pseudo-random code that generates a number.
     */
    linearRandomGenerator: (x0, a, b, m) => {
        x0 = (a * x0 + b) % m
        return x0
    },

    /**
     * Uses SmartWeave to get various data about a transaction.
     * @param {*} tx Transaction id.
     */
    loadTransactionToJson: async function(tx) {
        for (let i = 0; i < 10; i++) {
            try {
                return await JSON.parse(Smartweave.unsafeclient.transactions.getData(tx, {decode: true, string: true}))
            } catch (err) {}
        }
        throw new ContractError(`unable to load ${tx}`)
    },

    /**
     * "Safe" version of loadTransactionToJson: checks for tx being a string.
     * In this instance, the transaction = new block.
     */
    loadBlock: async function(tx) {
        if (tx instanceof 'string') {
            return this.loadTransactionToJson(tx)
        }
        return tx;
    },

    /**
     * A batch request of loadBlock.
     */
    getChunkOfBlocks: async function(blocks, fr, to) {
        const slice = blocks.slice(fr, to)
        return await Promise.all(slice.map(this.loadBlock))
    },

    /**
     * A helper function that gets a specific element (indexName) from a transaction's data.
     */
    getValuesInIndex: async function(tx, indexs, indexName) {
        const members = new Map()
        const memberAll = await this.loadTransactionToJson(tx)
        memberAll.forEach((json) => {
            if (indexs.has(json[indexName])) {
                members.set(json[indexName], json)
            }
        })
        return members
    },


    queryIndex: async function(indexTx, indexs, indexName) {
        const indexJson = await this.loadTransactionToJson(indexTx)
        indexs.sort()
        const toload = []
        let i = 0
        indexJson.array.forEach(element => {
            let indexset = null
            while (i < indexs.length) {
                if (indexs[i] < element.first) {
                    continue
                }
                if (indexs[i] <= element.last) {
                    if (indexset == null) {
                        indexset = set()
                    }
                    indexset.add(indexs[i])
                    i++
                } else {
                    break
                }
            }
            if (indexset != null) {
                // toload.push(this.getValuesInIndex(element.tx, indexset, indexName))
                toload.push([element.tx, indexset, indexName])
            }
        });
        const values = new Map()
        let fr = 0
        while (fr < toload.length) {
            const to = Math.min(toload.length, fr + 10)
            const calls = []
            toload.slice(fr, to).forEach((arr) => {
                calls.push(this.getValuesInIndex(arr[0], arr[1], arr[2]))
            })
            const result = await Promise.all(calls)
            result.forEach((element) => {
                values.putAll(element)
            })
            fr = to
        }
        return values
    },

    /**
     * Frees all of the staked value within all papers within a wallet.
     * See examplewalletstate.json
     */
    freeLocked: async function (state, ts){
        Object.values(state.wallets).forEach((wallet) => {
            Object.entries(wallet.paperstakes).forEach(([paperid, stake]) => {
                if (stake.until <= ts) {
                    wallet.amount += amount
                    delete wallet.paperstakes[paperid]
                    delete state.knowledge[paperid.toString()].stakingwallet
                }
            })
            const remove_locked = function (wallet) {
                Object.entries(wallet.locked).forEach(([until, amount]) => {
                    if (until <= ts) {
                        wallet.amount += amount
                        delete wallet.locked[until]
                    }
                })
            } 
            remove_locked(wallet)
            Object.values(wallet.knowledgetokens).forEach((knowledgewallet) => {
                Object.entries(knowledgewallet.locked).forEach(([until, value]) => {
                    wallet.amount += value.rosetta
                    knowledgewallet.amount += value.knowledge
                    delete knowledgewallet.locked[until]
                })
            })
        })
    },
    
    /**
     * Returns all possible members of the jury pool.
     */
    getJuryPool: function(state) {
        const result = []
        Object.entries(state.wallets).forEach(([address, wallet]) => {
            if (wallet.stake >= state.config.jurydutystake) {
                result.push(address)
            } 
        })
        return result
    },
    
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    hashtonumber: function (hash) {
        // Unfinished
    },
    
    /**
     * Selects and returns a psuedorandom number of jurors (addresses).
     */
    juryselect: function (state, trial) {
        let jurypool = this.getJuryPool(state)
        //ensure that the ordering of jurypool is deterministic
        jurypool.sort()
        let m = jurypool.length
        let selectedJury = new Set()
        if (m < trial.size) {
            //unable to form jury
            return []
        }
        let x0 = trial.trialid * this.hashtonumber(Smartweave.block.indep_hash)
        while (selectedJury.length < trial.size) {
            x0 = this.linearRandomGenerator(x0, 315614, 3152, m)
            selectedJury.add(jurypool[x0])
        }
        selectedJury = Array(selectedJury)
        selectedJury.sort()
        return selectedJury
    },
    
    /**
     * Progresses a trial to the next stage.
     */
    progresstrial: function (state, trial) {
        // Where did "ts" come from? I don't see where it's being initialized
        if (ts < trial.until) {
            switch(trial.currentstate) {
                case "open":
                    //What should we do if a jury cannot be formed?
                    trial.jury = this.juryselect(state, trial)
                    trial.currentstate = "deliberation"
                    trial.until += state.config.trialduration
                    break
                case "deliberation":
                    trial.currentstate = "openforappeal"
                    trial.until += state.config.trialduration
                    break
                case "openforappeal":
                    trial.currentstate = "closed"
                    let netvote = 0
                    trial.currentvote.forEach((vote) => {
                        netvote += vote.vote ? 1 : -1
                    })
                    const result = netvote > 0
                    // All voters in the majority will recieve their payout
                    const winners = []
                    trial.currentvote.forEach((vote) => {
                        if (vote.vote == result) {
                            winners.push(vote.wallet)
                        }
                    })
                    // not sure where jurorstake gets changed
                    const jurorpayout = (trial.jurorfees + trial.jurorstake) / winners.length
                    winners.forEach((address) => {
                        state.wallets[address].amount += jurorpayout
                    })
                    if (result) {
                        // if the vote succeeds the validator gets their stake back, plus the validation pool.
                        const validatorwallet = state.wallets[trial.validatorwallet]
                        validatorwallet.amount += trial.stakedvalidator
                        const knowledge = state.knowledge[trial.paperid.toString()]
                        validatorwallet.amount += knowledge.falsificationpool
                        if ("stakingwallet" in knowledge) {
                            const stakingwallet = knowledge.stakingwallet
                            validatorwallet.amount += stakingwallet.paperstakes[trial.paperid.toString()].amount
                            delete knowledge["stakingwallet"]
                            delete stakingwallet.paperstakes[trial.paperid.toString()]
                        }
                        knowledge.replicationpool.forEach((pool) => validatorwallet.amount += pool)
                        knowledge.invalidated = true
                        knowledge.replicationpool = []
                        knowledge.falsificationpool = 0
                    } else {
                        // if the vote fails the validator simply loses their stake, which is burned.
                        state.totalrosetta -= state.stakedvalidator
                    }
                    break
            }
        }
    },
    
    /**
     * Adds rosetta to every wallet registered. Uses impact score in its calculation.
     * https://rosetta-2.gitbook.io/rosetta-docs/rosetta-economy
     */
    mineRosetta: async function (state) {
        let totalimpactscore = 0
        Object.values(state.knowledge).forEach((knowledge) => {
            const impactscore = knowledge.impactscore
            let tokens = 1984
            Object.values(knowledge.reservedtokens).forEach((res) => {
                tokens -= res
            })
            totalimpactscore += tokens * impactscore
        })
        const newmint = state.totalrosetta * state.config.currentmint
        state.config.currentmint = Math.max(state.config.decayrate, state.config.minmint)
        const rosperimpactscore = newmint / totalimpactscore
        Object.values(state.wallets).forEach((wallet) => {
            Object.entries(wallet.knowledgetokens).forEach(([paperid, kwallet]) => {
                const impactscore = state.knowledgetokens[paperid].impactscore
                wallet.amount += kwallet.amount * impactscore * rosperimpactscore
                Object.values(kwallet.locked).forEach((value) => {
                    value.rosetta += value.knowledge * impactscore * rosperimpactscore
                })
            })
        })
        state.totalrosetta += newmint
    },


    updateState: function(state) {
        while (state.nextupdate <= SmartWeave.block.timestamp) {
            if (state.nextmine < state.nextmaintenance) {
                this.mineRosetta(state)
                state.nextmine += state.mineinterval
            } else {
                this.freeLocked(state, SmartWeave.block.timestamp)
                const trials = Object.entries(state.trials)
                // sort the trials to ensure that jury selection will occur in a deterministic order
                trials.sort((a, b) => {a[0] < b[0]? -1 : 1})
                trials.forEach(([trialid, trial]) => {
                    this.progresstrial(state, trial)
                    if (trial.currentstate == "closed") {
                        delete state.trials[trialid]
                    }
                })
                state.nextmaintenance += state.maintenanceinterval
            }
            state.nextupdate = Math.min(state.nextmaintenance, state.nextmine)
        }
    },
    
    // All of the functions within "mainfunctions" are the public actions that are available to
    // users calling the contract.
    mainfunctions: {
        /**
         * Allows a user to transfer rosetta or knowledge tokens to another wallet.
         * NOTE: transferring knowledge tokens isn't implemented, even if there is a "type" input
         */
        transfer: function (state, action) {
            const fr = action.caller // rename this to "from"
            const to = action.input.to
            const amount = action.input.amount
            const type = action.input.type
            if (!(fr in state.wallets)) {
                throw new ContractError(`${fr} does not exist`)
            }
            if (!(to in state.wallets)) {
                throw new ContractError(`${to} does not exist`)
            }
            const frwallet = state.wallets[fr]
            const towallet = state.wallets[to] 
            if (type != 'rosettta') {
                if (!(type in frwallet.knowledgetokens)) {
                    throw new ContractError(`${fr} does not have ${type} tokens`)                
                }
                if (!(type in towallet.knowledgetokens)) {
                    towallet.knowledgetokens[type] = this.defaultKnowledgeWallet()                
                }
            }
            if (!(fr in frwallet.amount < amount)) {
                throw new ContractError(`${fr} does not have enought ${type} tokens`)
            }
            frwallet.amount -= amount
            towallet.amount += amount
            return {state: state}
        },

        /**
         * Returns the information of a wallet to a user.
         */
        getBalance: function(state, action) {
            const wallet = "wallet" in action.input ? action.input.wallet : action.caller
            if (wallet in state.wallets) {
                return {request: state.wallets[wallet]}
            }
            throw new ContractError(`${wallet} does not exist.`)
        },

        /**
         * Allows a user to stake rosetta.
         * NOTE: I don't think staking is set up correctly. It should be staked on validation or papers themselves, right?
         */
        stakeRosetta: function(state, action) {
            const wallet = action.caller
            if (wallet in state.wallets) {
                const amount = action.input.amount
                if (amount >= state.wallets[wallet].amount) {
                    throw new ContractError(`${wallet} does not have ${amount} rosetta`)
                }
                state.wallets[wallet].amount -= amount
                state.wallets[wallet].stake += amount
                return {state: state}
            }
            throw new ContractError(`${wallet} does not exist.`)
        },

        /**
         * Allows a user to unstake rosetta.
         * NOTE: see note on stakeRosetta function.
         */
        unstakeRosetta: function(state, action) {
            const wallet = action.caller
            if (wallet in state.wallets) {
                const amount = action.input.amount
                if (amount >= state.wallets[wallet].stake) {
                    throw new ContractError(`${wallet} does not have ${amount} rosetta staked`)
                }
                state.wallets[wallet].amount += amount
                state.wallets[wallet].stake -= amount
                return {state: state}
            }
            throw new ContractError(`${wallet} does not exist.`)
        },

        /**
         * Creates a trial for a specific paperId.
         * See exampletrialstate.json
         */
        createTrial: function(state, action) {
            const wallet = action.caller
            if (action.input.paperid.toString() in state.trials) {
                throw new ContractError(`${paperid} is already being validated`)
            }
            if (wallet in state.wallets) {
                const amount = state.config.validationstake + state.config.jurydutyfee * state.config.initialjury
                if (amount >= state.wallets[wallet].amount) {
                    throw new ContractError(`${wallet} does not have ${amount} rosetta to stake/pay for trial`)
                }
                state.wallets[wallet].amount -= amount
                const trial = {
                    paperid: action.input.paperid,
                    validatorwallet: wallet,
                    stakedvalidator: state.config.validationstake,
                    jurorstake: 0,
                    jurorfees: state.config.jurydutyfee * state.config.initialjury,
                    trialsize: state.config.initialjury,
                    prosecutionevidence: [action.input.evidenceTx],
                    defenseevidence: [],
                    pastvote: [],
                    currentvote: [],
                    currentjurors: [],
                    currentstate: "open",
                    until: SmartWeave.block.timestamp + state.config.trialduration
                }
                state.trials[action.input.paperid.toString()] = trial
                state.config.trialid += 1
                return {state: state}
            }
            throw new ContractError(`${wallet} does not exist.`)
        },

        /**
         * I guess it allows a user to submit evidence to a trial?
         * NOTE: not sure what evidencelist is. Not defined here or in the state examples?
         */
        submitEvidence: function(state, action) {
            const trial = state.trials[action.input.paperid.toString()]
            evidencelist = action.input.forprosecution ? trial.prosecutionevidence : trial.defenseevidence
            return {state: state}
        },

        /**
         * Allows a juror to submit a vote on a trial.
         */
        submitVote: function(state, action) {
            const wallet = action.caller
            const trial = state.trials[action.input.paperid.toString()]
            if (trial.currentstate != 'deliberation') {
                throw new ContractError("No further voting on this trial")
            }
            if (trial.currentvote.filter((vote) => vote.wallet == wallet)) {
                throw new ContractError(`${wallet} has already voted on this trial`)
            }
            if (!(wallet in trial.currentjurors)) {
                throw new ContractError(`${wallet} is not a juror`)
            }
            trial.currentvote.push({
                wallet: wallet,
                vote: action.input.vote
            })
            return {state: state}
        },

        /**
         * Allows a user to call for an appeal in a trial. Switches from openforappeal phase to deliberation.
         */
        callAppeal: function(state, action) {
            const wallet = action.caller
            if (!(action.input.paperid.toString() in state.trials) || 
                (state.trials[action.input.paperid.toString()].currentstate != 'openforappeal')) {
                throw new ContractError(`${paperid} is not open for appeal`)
            }
            if (wallet in state.wallets) {
                trial = state.trials[action.input.paperid.toString()]
                trial.trialsize = trial.trialsize * 2 + 1
                const amount = state.config.jurydutyfee * trial.trialsize
                if (amount >= state.wallets[wallet].amount) {
                    throw new ContractError(`${wallet} does not have ${amount} rosetta to pay for appeal`)
                }
                state.wallets[wallet].amount -= amount
                trial.currentstate = 'deliberation'
                trial.pastvote.push(...trial.currentvote)
                trial.currentvote = []
                trial.currentjurors = rosettalib.juryselect(state, trial)
                if (trial.currentjurors.length == 0) {
                    throw new ContractError("insufficient jury pool")
                }
                trial.until = SmartWeave.block.timestamp + state.config.trialduration
                return {state: state}
            }
            throw new ContractError(`${wallet} does not exist.`)
        },

        /**
         * Publishes a new paper.
         */
        publishPaper(state, action) {
            const wallet = action.caller
            if (!action.input.newpublication && !(wallet in state.administrators)) {
                throw new ContractError("only an administrator can give tokens for mag papers")
            }
            if (action.input.newpublication) {
                const paperid = state.config.paperid
                state.config.paperid += 1
            } else {
                const paperid = action.input.paperid
            }
            if (!action.input.newpublication && action.input.paperid in state.knowledgetokens) {
                throw new ContractError("this paper has already been published")
            }
            if (!(wallet in state.wallets)) {
                throw new ContractError("The caller has no wallet")
            }
            const callerwallet = state.wallets[wallet]
            if (!action.input.newpublication) {
                if (callerwallet.amount < state.config.publicationstake) {
                    throw new ContractError("The caller wallet does not have enough rosetta to stake against this paper")
                }
                callerwallet.amount -= state.config.publicationstake
                callerwallet.paperstakes[action.input.paperid.toString()] = {
                    amount: state.config.publicationstake,
                    until: SmartWeave.block.timestamp += state.config.publicationduration
                }
            }
            let totalweight = 0
            action.input.authorweight.forEach((value) => {
                totalweight += value.weight
            })
            // NOTE: not sure if this is the right algorithm. Should be 1600 + 384, and 
            //          if you want that to be changeable, there should not be a constant (1984) here!
            const tokensforauthors = state.config.papertokenmint * 1984
            const tokensforreplication = (1984 - tokensforauthors) * state.config.publictokenreplication
            const tokensfortreasury = 1984 - tokensforreplication - tokensforauthors
            const reservedtokens = {}
            action.input.authorweight.forEach((value) => {
                const authtokens = (value.weight * tokensforauthors) / totalweight
                if (value.haswallet) {
                    authwallet = state.wallets[value.wallet]
                    authwallet.knowledgetokens[paperid.toString()] = rosettalib.defaultKnowledgeWallet()
                    authwallet.knowledgetokens[paperid.toString()].locked[
                        (SmartWeave.block.timestamp + state.config.publicationduration).toString()] = rosettalib.defaultlockedknowledge(authtokens)
                } else {
                    reservedtokens[value.wallet] = authtokens
                }
            })
            state.wallets[state.treasurywallet].knowledgetokens[paperid.toString()] = {
                amount: tokensfortreasury,
                locked: []
            }
            const impmap = rosettalib.queryIndex(state.indexImpactScore, [paperid], 'paperid')
            knowledgetokens[paperid.toString()] = {
                invalidated: false,
                stakingwallet: wallet,
                impactscore: paperid in impmap ? impmap.get(paperid) : 0,
                reservedtokens: reservedtokens,
                falsificationpool: 0,
                replicationpool: [0,0,0],
                replicationpapertoken: tokensforreplication
            }
            return {state: state}
        },

        /**
         * Allows an admin to claim knowledge tokens on a paper.
         */
        claimPaper: function(state, action) {
            const wallet = action.caller
            if (!(wallet in state.administrators)) {
                throw new ContractError("only an administrator can give tokens for mag papers")
            }
            const paperid = action.input.paperid.toString()
            const claimwallet = state.wallets[action.input.claimwallet]
            const knowledge = state.knowledgetokens[paperid]
            const authorid = action.input.authorid.toString()
            if (!(paperid in claimwallet.knowledgetokens)) {
                claimwallet.knowledgetokens[paperid] = rosettalib.defaultKnowledgeWallet()
            }
            claimwallet.knowledgetokens[paperid].locked[
                (SmartWeave.block.timestamp + 
                    state.config.publicationduration).toString()] = rosettalib.defaultlockedknowledge(knowledge.reservedtokens[authorid])
            return {state : state}
        },

        // TODO: change onboard to remove administrator onboard. Anyone should be able to make their own wallet.
        /**
         * Adds the default wallet to an address, and gives them access to the Rosetta ecosystem.
         */
        onboard: function(state, action) {
            const wallet = action.caller
            if (!(wallet in state.administrators)) {
                throw new ContractError("only an administrator can onboard wallets")
            }
            const newwallet = action.input.wallet
            if (newwallet in state.wallets) {
                throw new ContractError("wallet already onboarded")
            }
            state.wallets[newwallet] = rosettalib.defaultWallet()
            return {state : state}
        },

        /**
         * Proposes a change to the network
         */
        proposeChange: function(state, action) {
            // TODO: make it so that if there is a current change proposal, it fails
            if (!state.administrators[action.caller].canvote) {
                throw new ContractError("Caller does not have the authority to propose changes")
            }
            state.proposeChange = {
                votes: [{voter: action.caller, vote: true}],
                changes: action.input.changes
            }
            return {state : state}
        },

        /**
         * Allows an admin to vote on a change to the network
         */
        voteOnChange: function(state, action) {
            if (!state.administrators[action.caller].canvote) {
                throw new ContractError("Caller does not have the authority to propose changes")
            }
            if (!('proposeChange' in state)) {
                throw new ContractError("Change proposals not logged")
            }
            state.proposeChange.vote = state.proposeChange.vote.filter((v) => v.voter != action.caller)
            state.proposeChange.vote.push({
                voter: action.caller,
                vote: action.input.vote
            })
            const eligiblevoters = Object.values(state.administrators).forEach((v) => v.canvote).length
            const requiredvotes = eligiblevoters / 2
            const yesvotes = state.proposeChange.vote.filter((v) => v.vote)
            const nayvotes = state.proposeChange.vote.length - yesvotes
            if (yesvotes > requiredvotes) {
                if ('newcodeTx' in state.proposeChange) {
                    state.libraryTx = state.proposeChange.newcodeTx
                }
                if ('newconfig' in state.proposeChange) {
                    Object.entries(state.proposeChange.newconfig).forEach(([key, value]) => {
                        state.config[key] = value
                    })
                }
                if ('newadmins' in state.proposeChange) {
                    state.proposeChange.newadmins.forEach((v) => {
                        delete state.administrators[v.voter]
                        state.administrators[v.voter] = {
                            canvote: v.canvote
                        }
                    })
                }
                if ('removedadmins' in state.proposeChange) {
                    state.proposeChange.newadmins.forEach((v) => {
                        delete state.administrators[v.voter]
                    })
                }
                delete state.proposeChange
            } else if (nayvotes > requiredvotes) {
                delete state.proposeChange
            }
            return {state:state}
        }
    }
}