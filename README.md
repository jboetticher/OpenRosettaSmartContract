# Open Rosetta Smart Contracts
These are the smart contracts that govern the Open Rosetta project. They are powered by the SmartWeave project.



## Developer Environment
The developer environment depends on the following tools:
- [SmartWeave](https://github.com/ArweaveTeam/SmartWeave)
- [RedStone SmartWeave Contracts](https://github.com/redstone-finance/redstone-smartcontracts)
- [ArLocal](https://github.com/textury/arlocal)
- TypeScript
- ESLint

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

### ArLocal
Creates a local "gateway" server that allows us to test our SmartWeave contracts without 
having to deploy them by spending Arweave crypto. The CLI tool to start it is `npx arlocal`.

### RedStone SmartWeave Contracts
We are using RedStone SmartWeave contracts, because they have a stronger developer environment than
the first iteration of SmartWeave smart contracts. This includes things like logging, a stronger 
testing environment, and built in caching through RedStone's deployment.  
Learn more about RedStone smart contracts
[here](https://github.com/redstone-finance/redstone-smartcontracts).
Also consider completing RedStone academy for educational purposes
[here](https://github.com/redstone-finance/redstone-academy).

## Building
We use TypeScript in our project to help with testing, documentation, and technical debt. 
SmartWeave doesn't natively support TypeScript, so we must transpile TypeScript to vanilla
JavaScript in our build script. This is handled in the build command `npm run build`. You can
view the `build.js` script that accomplishes this in the scripts folder.

## Deploying Contracts
To deploy to Arweave with SmartWeave, you will need your keyfile for your account. The
project is set up to use a keyfile named `keyfile.json`, stored in the main directory. 
Take a look at the scripts to see how to customize your deployments.

## Testing
We use jest to run our test environment. Each test suite in jest requires a new instance of ArLocal,
otherwise a SQL error occurs. This is handled by the default function of `testSetup.ts`, which uses
a random port. It is unlikely for ports to conflict, but if they do, then you can either attempt to 
run the test suites again or run them individually.

## To-Do
- Refactor ContractException tests to do dry runs and check for an exception.
- Refactor inputs in tests to use input types.
- Add easy/modular standard tests (no wallet, not enough Rosetta, wrong permissions).
- Add fuzzing to input tests.

## Architecture Notes
SmartWeave contracts are all one file, but I've divided up the logic into a couple of components.  

First, there is the input validation. There's a file in the `src/OpenRosetta/types` folder that 
has a class for every external function that can be called by a user. These classes should make sure
that the right types are being put into the classes.  
One way to improve this system could be to have functions within the logic classes simply take in the 
inputs defined by the input validation classes. Worth looking into?  
Another thing to think about is whether or not ALL validation should be in the input classes. It's currently
only type based checks, not logic checks. Maybe the logic should stay with the logic classes?  

Second, there is the role management. Roles for every user are defined in their wallets, and the "enum" 
is defined within the main `OpenRosettaContract.ts` file. The RolesHandler helps check to make sure that
the caller has the correct permissions for each external function.  

Third, there are the logic classes themselves, which are spread across multiple "Handler" files. These 
are arbitrarily divided with very minor encapsulation, but that's better than a single monolithic file that 
contains every function. This system is a candidate for refactoring, but as it stands I'm happy with how
it works.