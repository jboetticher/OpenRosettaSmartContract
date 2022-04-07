/**
 * This file takes great inspiration from:
 * https://github.com/redstone-finance/redstone-academy/blob/main/redstone-academy-pst/final/tests/contract.test.ts
 */
import ArLocal from "arlocal";
import Arweave from "arweave/node/common";
import { JWKInterface } from "arweave/node/lib/wallet";
import { LoggerFactory, SmartWeaveNodeFactory } from "redstone-smartweave";
import { SmartWeave } from "redstone-smartweave/lib/types/core/SmartWeave";
import fs from "fs";
import path from 'path';

const AR_LOCAL_PORT = 1985;

/**
 * Mints a value of 1000000000000000 to a specified wallet (arlocal).
 * @param {Arweave} arweave The arweave instance to interact with.
 * @param {JWKInterface} wallet The wallet to add to.
 * @author @asiaziola
 */
export async function addFunds(arweave: Arweave, wallet: JWKInterface) {
    const walletAddress = await arweave.wallets.getAddress(wallet);
    await arweave.api.get(`/mint/${walletAddress}/1000000000000000`);
}

/**
 * Mines a block in the arweave instance provided (arlocal).
 * @param arweave The arweave instance to interact with.
 * @author @asiaziola
 */
export async function mineBlock(arweave: Arweave) {
    await arweave.api.get('mine');
}

/**
 * Generates a new Arweave wallet, returning the wallet and its address.
 * @param arweave An arweave instance.
 * @returns [wallet, walletAddress]; wallet is the JWKInterface, walletAddress is the address string
 */
 export async function createNewWallet(arweave: Arweave) {
    const wallet = await arweave.wallets.generate();
    const walletAddress = await arweave.wallets.getAddress(wallet);
    await addFunds(arweave, wallet);
    return { wallet, walletAddress };
}

export class SmartWeaveTestSuite {
    wallet: JWKInterface;
    address: string;
    arweave: Arweave;
    arlocal: ArLocal;
    smartweave: SmartWeave;
    contractSrc: string;
}

/**
 * Sets up a test for a SmartWeave smart contract (js).
 * @param contractSrc The path to a contract to test, likely in the "dist" folder.
 * @param stateSrc The path to the inital state to add to the state.
 * @returns {Promise<SmartWeaveTestSuite>} a suite of variables to test with.
 */
export default async function testSetup(): Promise<SmartWeaveTestSuite> {
    const arlocal: ArLocal = new ArLocal(AR_LOCAL_PORT, false);
    const arweave: Arweave = Arweave.init({
        host: 'localhost',
        protocol: 'http',
        port: AR_LOCAL_PORT
    });

    LoggerFactory.INST.logLevel('error');

    const smartweave: SmartWeave = SmartWeaveNodeFactory.memCached(arweave);
    const wallet: JWKInterface = await arweave.wallets.generate();
    await addFunds(arweave, wallet);
    const address: string = await arweave.wallets.jwkToAddress(wallet);

    const contractSrc = fs.readFileSync(
        path.join(__dirname, '../dist/contract.js'),
        'utf8'
    );

    return { wallet, address, arweave, arlocal, smartweave, contractSrc };
}
