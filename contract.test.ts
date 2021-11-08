// import {
//   createContract,
//   interactRead,
//   interactWrite,
//   readContract
// } from "smartweave";

const smartweave = require('smartweave')

// const jest = require('@jest/globals')
import {describe, expect, beforeAll} from '@jest/globals'

const readFile = require('fs/promises')
// import { readFile } from "fs/promises";
import { join } from "path";
import ArLocal from "arlocal";
// import Arweave from "arweave";

const Arweave = require("arweave")
var assert = require("assert")

let arweave;
let arlocal;

const port = 1990;

describe("Test the NFT contract", () => {
  let CONTRACT_ID;
  // let CONTRACT2_ID: string;
  let wallet1 = { address: "", jwk: undefined };
  let wallet2 = { address: "", jwk: undefined };
  let wallet3 = { address: "", jwk: undefined };

  async function state() {
    return await readContract(arweave, CONTRACT_ID);
  }

  beforeAll(async () => {
    arlocal = new ArLocal(port, false);

    await arlocal.start();

    arweave = Arweave.init({
      host: "localhost",
      port: port,
      protocol: "http"
    });

    wallet1.jwk = await arweave.wallets.generate();
    wallet2.jwk = await arweave.wallets.generate();
    wallet3.jwk = await arweave.wallets.generate();
    wallet1.address = await arweave.wallets.getAddress(wallet1.jwk);
    wallet2.address = await arweave.wallets.getAddress(wallet2.jwk);
    wallet3.address = await arweave.wallets.getAddress(wallet3.jwk);
    

    const contractSrc = new TextDecoder().decode(
      await readFile(join("MainSmartContract.js"))
    );
    const initialState = {
        wallets: {
            [wallet1.address]: {
                amount: 315153,
                staked: 135,
                paperstakes: {
                    143: {
                        amount: 3153,
                        until: 4252
                    }
                },
                locked: {
                    3531: 325
                },
                knowledgetokens: {
                    153: {
                        amount: 315,
                        locked: {
                            15131: {
                                rosetta: 1515,
                                knowledge: 315
                            }
                        }
                    }
                },
                trials: {
                    14: true
                }
            },
            [wallet2.address]: {
                amount: 0,
                staked: 0,
                paperstakes: {},
                locked: {},
                knowledgetokens: {}
            }
        }
    };

    CONTRACT_ID = await createContract(
      arweave,
      wallet1.jwk,
      contractSrc,
      JSON.stringify(initialState)
    );

    await mine();
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it("should return balance for address", async () => {
    const balance = await interactRead(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "getBalance"
    });
    await mine();
    console.log(balance.balance)
    expect(balance?.balance).toEqual(315153);
  });
});

async function mine() {
  await arweave.api.get("mine");
}