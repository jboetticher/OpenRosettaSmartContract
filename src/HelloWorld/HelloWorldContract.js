/**
 * Arweave smart contracts must start with a handle function. 
 * This is akin to the "main" function in other programming languages.
 * @param {*} state The data stored on the blockchain relevant to the smart contract.
 * @param {*} action Details on the action that the user is attempting to do.
 */
export function handle(state, action) {
  const balances = state.balances;
  const input = action.input;
  const caller = action.caller;

  balances["test"] = 1000;

  if (input.function === 'increment') {
    // If the caller already is a key of balances, increment, if not, set it to 1.
    if (caller in balances) {
      balances[caller]++;
    } 
    else {
      balances[caller] = 1;
    }
  }
  else if (input.function === 'decrement') {
    // If the caller already is a key of balances, decrement, if not, set it to 1.
    if (caller in balances) {
      balances[caller]--;
    }
    else {
      balances[caller] = 1;
    }
  }

  return state;
}