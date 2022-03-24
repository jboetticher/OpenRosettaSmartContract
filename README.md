# Open Rosetta Smart Contracts
These are the smart contracts that govern the Open Rosetta project. They are powered by the SmartWeave project.

### Installing SmartWeave
You must have smartweave installed on your device to deploy these contracts:
```
npm install -g smartweave
```

### Deploying Contracts
To deploy to Arweave with SmartWeave, you will need your keyfile for your account. The
project is set up to use a keyfile named `keyfile.json`, stored in the main directory.

## What is SmartWeave?
Cedrik Boudreau has a nice series of 
[articles](https://cedriking.medium.com/lets-buidl-smartweave-contracts-6353d22c4561) 
introducing them.  
Unlike EVM smart contracts, validators don't do any work, and there is no gas involved.
Instead, transaction validation is pushed to users of smart contracts, who cryptographically 
evaluate previous transactions themselves. 