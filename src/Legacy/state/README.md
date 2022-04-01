# Legacy States
There was no documentation on how the states provided in the code worked
together, so this is built from what can be inferred from the code. The
working belief is that the state isn't made up of multiple states, and is 
instead one big state, just not explicitly so in the 
`examplecontractstate.json`.  
Feel free to edit if it doesn't make sense.
 
## Descriptions
- `examplecontractstate.json` is the parent contract state.
- `examplepaperstate.json` is the collection of papers. 
    - Key: the paperId.
    - Element: paper data.
- `examplewalletstate.json` is the collection of wallets with rosetta.
    - Key: the wallet address.
    - Element: tokens that the user holds (rosetta & knowledge tokens).
- `exampletrialstate.json`
    - Key: the trial's id.
    - Element: the trial data.
- `examplejurypool.json`
    - As far as I can tell, this is unused. Besides, it's just an array of 
    addresses.
    - Jury pool is currently calculated when requested.
- `exampletransactionblock.json`
    - This also looks like it's unused. Probably a schema of a potential 
    transaction block.
    - We are using smart contracts, not our own chain. Though, I suppose 
    blocks could be one-to-one with Arweave blocks?

## Relationships
-  `examplecontractstate.json`
    - knowledge: `examplepaperstate.json`
    - wallets: `examplewalletstate.json`
    - trials: `exampletrialstate.json`