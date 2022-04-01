# Basic ArLocal Scripts
These are scripts that you can use to test if you don't want to use typescript to transpile into 
javascript.

## Testing With ArLocal
There are a mixture of scripts to use within this folder to help test the smart 
contracts locally. Before using these scripts, you should run arlocal with either `npx arlocal`
or `npm run arlocal`.   

You can edit `arLocalDeployment.js` to specify the contract file you want to deploy locally. Run
with `npm run deploylocal`.  

You can edit `arLocalRead.js` to specify the state transaction you want to read from. Run with
`npm run readlocal`. Alternatively, you can specify the transaction in the console with 
`npm run readlocal --tx=CONTRACT_TRANSACTION_ID`.  

You can edit `arLocalWrite.js` to specify the contract you wish to write to and which function 
you wish to call. Run with `npm run writelocal`. Alternatively, you can specify with:
```
npm run writelocal --function=FUNCTION_NAME --tx=CONTRACT_TRANSACTION_ID
```