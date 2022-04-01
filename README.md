# Open Rosetta Smart Contracts
These are the smart contracts that govern the Open Rosetta project. They are powered by the SmartWeave project.



## Developer Environment
The developer environment depends on the following tools:
- [SmartWeave](https://github.com/ArweaveTeam/SmartWeave)
- [ArLocal](https://github.com/textury/arlocal)

Install dependencies with `npm install`.

### SmartWeave
Cedrik Boudreau has a nice series of 
[articles](https://cedriking.medium.com/lets-buidl-smartweave-contracts-6353d22c4561) 
introducing them.  
Unlike EVM smart contracts, validators don't do any work, and there is no gas involved.
Instead, transaction validation is pushed to users of smart contracts, who cryptographically 
evaluate previous transactions themselves. Logic in smart contracts have no inherit state, 
instead they have a state that is provided to them.  
The most important paradigm shift is scaling: if the user has to download all of the previous
transactions, then you have to ensure that your data structure doesn't bloat to many gigabytes.  
Additionally, without a caching solution, every smart contract is vulnerable to a denial of 
service attack by bloating transactions. SmartWeave contracts are in early development.  

#### **Installing SmartWeave**
You must have smartweave installed on your device to deploy these contracts:
```
npm install -g smartweave
```

### ArLocal
Creates a local "gateway" server that allows us to test our SmartWeave contracts without 
having to deploy them by spending Arweave crypto. The CLI tool to start it is `npx arlocal`.

## Deploying Contracts
To deploy to Arweave with SmartWeave, you will need your keyfile for your account. The
project is set up to use a keyfile named `keyfile.json`, stored in the main directory. You
also ought to have a second file named `address.json` in the same directory:  
```
{ "address": "YOUR WALLET ADDRESS" }
```

