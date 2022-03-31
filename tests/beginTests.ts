import ArLocal from "arlocal";
import Arweave from "arweave/node/common";
import { JWKInterface } from "arweave/node/lib/wallet";
import { SmartWeave } from "redstone-smartweave/lib/types/core/SmartWeave";


/**
 * 
 */
export default function beginTest(contractSrc: string) {
    let wallet: JWKInterface;
    let walletAddress: string;
    let arweave: Arweave;
    let arlocal: ArLocal;
    let smartweave: SmartWeave;
}