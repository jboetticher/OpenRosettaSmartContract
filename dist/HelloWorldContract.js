(() => {
  // src/HelloWorld/HelloWorldContract.ts
  var testHandler;
  var otherHandler;
  async function handle(state, action) {
    const input = action.input;
    testHandler = new TestClassBasedLogic();
    otherHandler = new TestOtherClass();
    switch (input.function) {
      case "increment":
        return testHandler.increment(state, action);
    }
    return { state };
  }
  var TestClassBasedLogic = class {
    increment(state, action) {
      const balances = state.balances;
      const caller = action.caller;
      if (caller in balances) {
        balances[caller]++;
      } else {
        balances[caller] = otherHandler.ten();
      }
      return { state };
    }
  };
  var TestOtherClass = class {
    ten() {
      return 10;
    }
  };
})();
