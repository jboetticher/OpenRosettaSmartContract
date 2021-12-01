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

async function uploadTransaction(data, key) {

  let transaction = await arweave.createTransaction({ data: data }, key);
  transaction.addTag('Content-Type', 'text');

  await arweave.transactions.sign(transaction, key);

  let uploader = await arweave.transactions.getUploader(transaction);

  while (!uploader.isComplete) {
    await uploader.uploadChunk();
  }

  return transaction.id
}

describe("Test the NFT contract", () => {
  let CONTRACT_ID;
  // let CONTRACT2_ID: string;
  let wallet1 = { address: "", jwk: undefined };
  let wallet2 = { address: "", jwk: undefined };
  let wallet3 = { address: "", jwk: undefined };
  let wallet4 = { address: "", jwk: undefined };
  let wallet5 = { address: "", jwk: undefined };

  const generateTransfer = async function (
    from,
    to,
    amount,
    type,
    write = false
  ) {
    let func = write ? interactWrite : interactRead
    return await func(arweave, from, CONTRACT_ID, {
      function: "transfer",
      to: to,
      amount: amount,
      type: type,
    });
  };
  const generateBalance = async function (from) {
    return await interactRead(arweave, from, CONTRACT_ID, {
      function: "getBalance",
    });
  };
  const generateStake = async function (
    from,
    amount,
    write = false
  ) {
    let func = write ? interactWrite : interactRead
    return await func(arweave, from, CONTRACT_ID, {
      function: "stakeRosetta",
      amount: amount,
    });
  };
  const generateUnStake = async function (from, amount, write = false) {
    let func = write ? interactWrite : interactRead
    return await func(arweave, from, CONTRACT_ID, {
      function: "unstakeRosetta",
      amount: amount
    });
  }
  const generateOnboarding = async function (from, wallet, write) {
    let func = write ? interactWrite : interactRead
    return await func(arweave, from, CONTRACT_ID, {
      function: "onboard",
      wallet: wallet
    });
  }
  const generatePublishPaper = async function (from, paperid, newpublication, authorweights) {
    let func = write ? interactWrite : interactRead
    return await func(arweave, from, CONTRACT_ID, {
      function: "publishPaper",
      paperid: paperid,
      newpublication: newpublication,
      authorweights: authorweights
    });
  }
  const generateClaimPaper = async function (from, paperid, authorid) {
    let func = write ? interactWrite : interactRead
    return await func(arweave, from, CONTRACT_ID, {
      function: "claimPaper",
      paperid: paperid,
      authorid: authorid
    });
  }
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
    wallet4.jwk = await arweave.wallets.generate();
    wallet5.jwk = await arweave.wallets.generate();
    wallet1.address = await arweave.wallets.getAddress(wallet1.jwk);
    wallet2.address = await arweave.wallets.getAddress(wallet2.jwk);
    wallet3.address = await arweave.wallets.getAddress(wallet3.jwk);
    wallet4.address = await arweave.wallets.getAddress(wallet4.jwk);
    wallet5.address = await arweave.wallets.getAddress(wallet5.jwk);


    const contractSrc = await new TextDecoder().decode(
      await readFile(join("MainSmartContract.js"))
    );

    const chunk6tx = await uploadTransaction(await readFile('prbchunks6.txt'), wallet1.jwk)
    const chunk421tx = await uploadTransaction(await readFile('prbchunks421.txt'), wallet1.jwk)

    const index = `48531535\t56594065\t${chunk6tx}\n2171022989\t2171934030\t${chunk421tx}\n`
    const indexlocation = await uploadTransaction(index, wallet1.jwk)
    console.log(indexlocation)

    const initialState = {
      indexImpactScore: indexlocation,
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
      administrators: {
        [wallet3.address]: {
          canvotes: true
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
  });

  it("should be able to transfer funds", async () => {
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
    expect(await generateTransfer(wallet1.jwk, wallet2.address, undefined, "rosetta")).toBe(`${undefined} is not a number`)
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
  it("should stake rosetta", async () => {
    expect(await generateStake(wallet3.jwk, 100)).toBe(`${wallet3.address} does not exist.`)
    expect(await generateUnStake(wallet3.jwk, 100)).toBe(`${wallet3.address} does not exist.`)
    expect(await generateStake(wallet1.jwk, 100)).toBe(undefined)
    expect(await generateUnStake(wallet1.jwk, 100)).toBe(undefined)
    expect(await generateStake(wallet1.jwk, -100)).toBe(`only positive amounts may be transferred`)
    expect(await generateUnStake(wallet1.jwk, -100)).toBe(`only positive amounts may be transferred`)
    expect(await generateStake(wallet1.jwk, undefined)).toBe(`${undefined} is not a number`)
    expect(await generateUnStake(wallet1.jwk, undefined)).toBe(`${undefined} is not a number`)
    expect(await generateStake(wallet2.jwk, 101)).toBe(`${wallet2.address} does not have enough rosetta`)
    expect(await generateUnStake(wallet2.jwk, 101)).toBe(`${wallet2.address} does not have enough rosetta staked`)
    await generateStake(wallet1.jwk, 50, true)
    mine()
    expect(await generateBalance(wallet1.jwk)).toEqual(
      {
        amount: 315003,
        staked: 185,
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
      }
    )
    await generateUnStake(wallet1.jwk, 70, true)
    mine()
    expect(await generateBalance(wallet1.jwk)).toEqual(
      {
        amount: 315073,
        staked: 115,
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
      }
    )
  })


  it("onboard a user", async () => {
    expect(await generateOnboarding(wallet1.jwk, wallet4.address)).toBe('only an administrator can onboard wallets')
    expect(await generateOnboarding(wallet1.jwk, wallet2.address)).toBe('only an administrator can onboard wallets')
    expect(await generateOnboarding(wallet4.jwk, wallet4.address)).toBe('only an administrator can onboard wallets')
    expect(await generateOnboarding(wallet4.jwk, wallet1.address)).toBe('only an administrator can onboard wallets')
    expect(await generateOnboarding(wallet3.jwk, wallet1.address)).toBe('wallet already onboarded')
    expect(await generateOnboarding(wallet3.jwk, wallet4.address)).toBe(undefined)
    expect(await generateBalance(wallet4.jwk)).toBe(`${wallet4.address} does not exist.`)
    await generateOnboarding(wallet3.jwk, wallet4.address, true)
    await mine()
    expect(await generateBalance(wallet4.jwk)).toEqual({
      amount: 0,
      knowledgetokens: {},
      locked: {},
      paperstakes: {},
      staked: 0,
      trials: []
    })
  })

  it("publish a paper", async () => {
    
  })

  // it("onboard a user", async () => {

  // })
});

async function mine() {
  await arweave.api.get("mine");
}
