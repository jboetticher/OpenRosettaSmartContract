const rosettalib = {
    defaultWallet: function () {
        return {
            amount: 0,
            staked: 0,
            paperstakes: {},
            locked: {},
            knowledgetokens: {},
            trials: []
        }
    },
    defaultKnowledgeWallet: function () {
        return {
            amount: 0,
            locked: []
        }
    },
    loadTransactionToJson: async function (tx) {
        for (let i = 0; i < 10; i++) {
            try {
                return await JSON.parse(Smartweave.unsafeclient.transactions.getData(tx, { decode: true, string: true }))
            } catch (err) { }
        }
        throw new ContractError(`unable to load ${tx}`)
    },
    loadBlock: async function (tx) {
        if (tx instanceof 'string') {
            return this.loadTransactionToJson(tx)
        }
        return tx
    },
    getChunkOfBlocks: async function (blocks, fr, to) {
        const slice = blocks.slice(fr, to)
        return await Promise.all(slice.map(this.loadBlock))
    },
    getValuesInIndex: async function (tx, indexs, indexName) {
        const members = new Map()
        const memberAll = await this.loadTransactionToJson(tx)
        memberAll.forEach((json) => {
            if (indexs.has(json[indexName])) {
                members.set(json[indexName], json)
            }
        })
        return members
    },
    queryIndex: async function (indexTx, indexs, indexName) {
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
    getInitialWallet: async function (state, wallets) {
        return this.queryIndex(state.initialWalletTx, wallets, "wallet")
    },
    getInitialTrial: async function (state, trials) {
        return this.queryIndex(state.initialTrialTx, trials, "trialid")
    },
    getPaperState: async function (state, papers) {
        return this.queryIndex(state.initialPaperTx, papers, "paperid")
    },
    updateWalletFromTransfer: function (transfer, wallet, isoutgoing) {
        const amount = isoutgoing ? -transfer.amount : transfer.amount
        if (transfer.type == 'rosetta') {
            wallet.amount += amount
        } else {
            if (!(transfer.type in fromwallet.knowledgetokens)) {
                wallet.knowledgetokens[transfer.type] = this.defaultKnowledgeWallet()
            } else {
                wallet.knowledgetokens[transfer.type].amount += transfer.amount
            }
        }
    },
    updateWalletPublish: function (publish, wallets) {
        publish.knowledgetokens.forEach((element) => {
            if ((element.authorid instanceof 'string') && (element.authorid in wallets)) {
                const wallet = wallets[element.authorid]
                if (!(paperid in wallet.knowledgetokens)) {
                    wallet.knowledgetokens[paperid] = this.defaultKnowledgeWallet()
                }
                wallet.knowledgetokens[paperid].locked.push({
                    amount: element.amount,
                    until: element.locked
                })
            }
        })
        publish.stakes.forEach((stake) => {
            if (stake.wallet in wallets) {
                const wallet = wallets[stake.wallet]
                wallet.amount -= stake.amount
                wallet.paperstakes[publish.paperid] = {
                    amount: stake.amount,
                    until: stake.until
                }
            }
        })
    },
    updateWalletClaim: async function (claim, wallet, currentblocknumber, state) {
        const paperidstring = claim.paperid.toString()
        if (!(claim.paperid in wallet.knowledgetokens)) {
            wallet.knowledgetokens[paperidstring] = this.defaultKnowledgeWallet()
        }
        const paperStates = this.getPaperState(state, claim.paperid)
        if (claim.paperid in paperids) {
            const paperState = paperStates[claim.paperid]
            if (claim.authorid.toString() in paperState.reservedtokens) {
                wallet.knowledgetokens[paperidstring].locked.push({
                    amount: paperState.reservedtokens[claim.authorid.toString()],
                    until: claim.locked
                })
            }
        }
    },
    mineImpactScore: async function (papersMap, indexTx) {
        const impactScores = await this.queryIndex(indexTx, papersMap.keys(), "paperid")
    },
    updateWalletInformation: async function (block, wallets, trials, currentblocknumber, state) {
        //This function will update most of the information with respect to wallets to the wallets specified.
        //It does not update fees received for jury particapation. But does return the trials involved for later update.
        block.transfers.forEach((transfer) => {
            if (transfer.from in wallets) {
                this.updateWalletFromTransfer(transfer, wallets[transfer.from], true)
            }
            if (transfer.to in wallets) {
                this.updateWalletFromTransfer(transfer, wallets[transfer.to], false)
            }
        })
        block.stake.forEach((stake) => {
            if (stake.from in wallets) {
                wallets[transfer.from].amount -= stake.amount
                wallets[transfer.from].stake += stake.amount
                this.updateWalletFromTransfer(transfer, wallets[transfer.from], true)
            }
        })
        block.publish.forEach((publish) => this.updateWalletPublish(publish, wallets, currentblocknumber))
        block.claim.forEach((claim) => {
            if (claim.wallet in wallets) {
                this.updateWalletClaim(claim, wallets[claim.wallet], currentblocknumber, state)
            }
        })
        block.openvalidation.forEach((openvalidation) => {
            if (openvalidation.validatorwallet in wallets) {
                wallets[openvalidation.validatorwallet].amount -= openvalidation.stake
            }
        })
        block.juryselection.forEach((juryselection) => {
            juryselection.jurors.forEach((juror) => {
                if (juror in wallets) {
                    wallets[juror].amount -= juryselection.staketaken
                    wallets[juror].trials.push(juryselection.trialid)
                }
            })
        })
        // block.trialvotes.forEach((vote) => {
        //     if (vote.juror in wallets) {
        //         wallets[vote.juror].trials[vote.trialid.toString()] = vote.voteforinvalidation
        //     }
        // })
        block.appeals.forEach((appeal) => {
            if (appeal.wallet in wallets) {
                wallets[appeal.wallet].amount -= appeal.fee
            }
        })
        block.impactscoreupdate.forEach(impactscoreupdate => {
            const paperidtowallets = new Map()
            wallets.values().forEach((wallet) => {
                wallet.knowledgetokens.keys().forEach(paperid => {
                    const paperidint = paperid.parse()
                    if (!paperidtowallets.has(paperidint)) {
                        paperidtowallets[paperidint] = []
                    }
                    paperidtowallets[paperidint].push(wallet)
                }
                )
            })
        })
    },
    getWalletDataFromBlock: async function (currentblocknumber, block, wallets) {
        block.transfers
    },
    getWalletData: async function (state, action) {

    },
    verifyBlock: async function () { },
    mainfunctions: {
        getBalances: async function (state, action) { },
        addToBlock: async function (state, action) { },
        registerBlock: async function (state, action) { },
        registerSnapShot: async function (state, action) { }
    }
}