/**
 * Arweave smart contracts must start with a handle function. 
 * This is akin to the "main" function in other programming languages.
 * @param {*} state The data stored on the blockchain relevant to the smart contract.
 * @param {*} action 
 * @returns 
 */
async function handle(state, action) {
    eval(SmartWeave.unsafeClient.transactions.getData(state.libraryTx, {decode: true, string: true}))
    return await lib.mainfunctions[action.input.function](state, action)
}