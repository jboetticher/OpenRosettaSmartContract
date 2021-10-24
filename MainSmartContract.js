
async function handle(state, action) {
    eval(SmartWeave.unsafeClient.transactions.getData(state.libraryTx, {decode: true, string: true}))
    return await lib.mainfunctions[action.input.function](state, action)
}