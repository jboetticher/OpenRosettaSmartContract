let testHandler, otherHandler;

/**
 * Arweave smart contracts must start with a handle function. 
 * This is akin to the "main" function in other programming languages.
 * @param {*} state The data stored on the blockchain relevant to the smart contract.
 * @param {*} action Details on the action that the user is attempting to do.
 */
export async function handle(state, action) {
  const input = action.input;
  testHandler = new TestClassBasedLogic();
  otherHandler = new TestOtherClass();

  switch(input.function) {
    case 'increment': return testHandler.increment(state, action);
  }

  return { state };
}

class TestClassBasedLogic {
  increment(state, action) {
    const balances = state.balances;
    const caller = action.caller;

    // If the caller already is a key of balances, increment, if not, set it to 1.
    if (caller in balances) {
      balances[caller]++;
    }
    else {
      balances[caller] = otherHandler.ten();
    }
    return { state };
  }
}

class TestOtherClass {
  ten() {
    return 10;
  }
}