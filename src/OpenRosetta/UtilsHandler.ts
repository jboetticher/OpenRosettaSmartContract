import { SmartWeaveGlobal } from "redstone-smartweave";
import { KnowledgeWallet, RosettaWallet } from "./types/StateTypes";
declare const SmartWeave: SmartWeaveGlobal;

export default class UtilsHandler {
    /**
     * Parses a byteArray into a BigNumber format.
     * @param {Uint8Array} byteArr The byte array to parse.
     * @returns {bigint} A bigint number parsed from the input..
     */
    static bigIntFromBytes(byteArr: Uint8Array): bigint {
        let hexString = "";
        for (const byte of byteArr) {
            hexString += byte.toString(16).padStart(2, '0');
        }
        return BigInt("0x" + hexString);
    }

    /**
     * Generates a pseudo-random int value that is less than the 'max' argument.
     * To correctly generate several random numbers in a single contract interaction, you
     * should pass different values for the 'uniqueValue' argument.
     * @param max The maximum random number to return (exclusive).
     * @param caller The address of the calling user.
     * @param uniqueValue An optional unique string to generate a value from.
     * @returns A number between 0 (inclusive) and number (exclusive).
     * @author asiaziola
     */
    static async getRandomIntNumber(max: number, caller: string, uniqueValue = ""): Promise<number> {
        const pseudoRandomData = SmartWeave.arweave.utils.stringToBuffer(
            SmartWeave.block.height
            + SmartWeave.block.timestamp
            + SmartWeave.transaction.id
            + caller
            + uniqueValue
        );
        const hashBytes = await SmartWeave.arweave.crypto.hash(pseudoRandomData);
        const randomBigInt = this.bigIntFromBytes(hashBytes);
        return Number(randomBigInt % BigInt(max));
    }

    /**Scaffolds the default (empty) wallet object. */
    static defaultWallet(): RosettaWallet {
        return {
            amount: 0,
            role: 0,
            paperStakes: [],
            knowledgeTokens: []
        }
    }

    /** Scaffolds the default (empty) knowledge wallet object. */
    static defaultKnowledgeWallet(): KnowledgeWallet {
        return { amount: 0, locked: { unlock: 0, amount: 0 } };
    }
}