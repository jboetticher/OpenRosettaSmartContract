import {
  createContract,
  interactRead,
  interactWrite,
  readContract,
} from "smartweave";

import { describe, expect, beforeAll } from "@jest/globals";

const jestglobals = require("@jest/globals");

// const readFile = require('fs/promises')
import { readFile } from "fs/promises";
import { join } from "path";
import ArLocal from "arlocal";
import Arweave from "arweave";

// const Arweave = require("arweave")
// var assert = require("assert")

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
      protocol: "http",
    });

    wallet1.jwk = await arweave.wallets.generate();
    wallet2.jwk = await arweave.wallets.generate();
    wallet3.jwk = await arweave.wallets.generate();
    wallet1.address = await arweave.wallets.getAddress(wallet1.jwk);
    wallet2.address = await arweave.wallets.getAddress(wallet2.jwk);
    wallet3.address = await arweave.wallets.getAddress(wallet3.jwk);

    const contractSrc = await new TextDecoder().decode(
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
              until: 4252,
            },
          },
          locked: {
            3531: 325,
          },
          knowledgetokens: {
            153: {
              amount: 315,
              locked: {
                15131: {
                  rosetta: 1515,
                  knowledge: 315,
                },
              },
            },
          },
          trials: {
            14: true,
          },
        },
        [wallet2.address]: {
          amount: 0,
          staked: 0,
          paperstakes: {},
          locked: {},
          knowledgetokens: {},
        },
      },
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
    let balance = await interactRead(arweave, wallet1.jwk, CONTRACT_ID, {
      function: "getBalance",
    });
    await mine();
    expect(balance).toEqual({
      amount: 315153,
      staked: 135,
      paperstakes: {
        143: {
          amount: 3153,
          until: 4252,
        },
      },
      locked: {
        3531: 325,
      },
      knowledgetokens: {
        153: {
          amount: 315,
          locked: {
            15131: {
              rosetta: 1515,
              knowledge: 315,
            },
          },
        },
      },
      trials: {
        14: true,
      },
    });
    balance = await interactRead(arweave, wallet2.jwk, CONTRACT_ID, {
      function: "getBalance",
    });
    await mine();
    expect(balance).toEqual({
      amount: 0,
      staked: 0,
      paperstakes: {},
      locked: {},
      knowledgetokens: {},
    });
    expect(
      await interactRead(arweave, wallet3.jwk, CONTRACT_ID, {
        function: "getBalance",
      })
    ).toBe(`${wallet3.address} does not exist.`);
    // ).toThrow()
  });

  it("should be able to transfer funds", async () => {
    const generateTransfer = async function (
      from,
      to,
      amount,
      type,
      write = false
    ) {
      if (write) {
        return await interactWrite(arweave, from, CONTRACT_ID, {
          function: "transfer",
          to: to,
          amount: amount,
          type: type,
        });
      } else {
        return await interactRead(arweave, from, CONTRACT_ID, {
          function: "transfer",
          to: to,
          amount: amount,
          type: type,
        });
      }
    };
    const generateBalance = async function (from) {
      return await interactRead(arweave, from, CONTRACT_ID, {
        function: "getBalance",
      });
    };
    expect(
      await generateTransfer(wallet1.jwk, wallet3.address, 100, "rosetta")
    ).toBe(`${wallet3.address} does not exist`);
    expect(
      await generateTransfer(wallet3.jwk, wallet1.address, 100, "rosetta")
    ).toBe(`${wallet3.address} does not exist`);
    expect(
      await generateTransfer(wallet1.jwk, wallet2.address, 0, "rosetta")
    ).toBe(`only positive amounts may be transferred`);
    expect(
      await generateTransfer(wallet1.jwk, wallet2.address, -100, "rosetta")
    ).toBe(`only positive amounts may be transferred`);
    expect(await generateTransfer(wallet1.jwk, wallet3.address, 100, "1")).toBe(
      `${wallet3.address} does not exist`
    );
    expect(await generateTransfer(wallet3.jwk, wallet1.address, 100, "1")).toBe(
      `${wallet3.address} does not exist`
    );
    expect(await generateTransfer(wallet1.jwk, wallet2.address, 0, "1")).toBe(
      `only positive amounts may be transferred`
    );
    expect(
      await generateTransfer(wallet1.jwk, wallet2.address, -100, "1")
    ).toBe(`only positive amounts may be transferred`);
    expect(
      await generateTransfer(wallet2.jwk, wallet1.address, 100, "rosetta")
    ).toBe(`${wallet2.address} does not have enought rosetta tokens`);
    // expect(await generateTransfer(wallet2.jwk, wallet1.address, 100, '1')).toBe(
    //     `${wallet2.address} does not have 1 tokens`
    // )
    expect(
      await generateTransfer(wallet1.jwk, wallet2.address, 100, "153")
    ).toBe(undefined);
    expect(
      await generateTransfer(wallet1.jwk, wallet2.address, 100, "rosetta")
    ).toBe(undefined);
    await generateTransfer(wallet1.jwk, wallet2.address, 100, "153", true);
    await mine();
    await generateTransfer(wallet1.jwk, wallet2.address, 100, "rosetta", true);
    await mine();
    expect(await generateBalance(wallet1.jwk)).toEqual({
      amount: 315053,
      staked: 135,
      paperstakes: {
        143: {
          amount: 3153,
          until: 4252,
        },
      },
      locked: {
        3531: 325,
      },
      knowledgetokens: {
        153: {
          amount: 215,
          locked: {
            15131: {
              rosetta: 1515,
              knowledge: 315,
            },
          },
        },
      },
      trials: {
        14: true,
      },
    });
    expect(await generateBalance(wallet2.jwk)).toEqual({
      amount: 100,
      staked: 0,
      paperstakes: {},
      locked: {},
      knowledgetokens: {
        153: {
          amount: 100,
          locked: [],
        },
      },
    });
  });
});

async function mine() {
  await arweave.api.get("mine");
}
