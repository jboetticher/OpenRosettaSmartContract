//import { RedStoneLogger } from "redstone-smartweave";
import { NetworkState, RosettaWallet } from "./types/StateTypes";
declare const ContractError;

//declare const logger: RedStoneLogger;

/**
 * Handles all of the wallet logic.
 */
export default class RolesHandler {
    state: NetworkState;
    admin: number;

    /**
     * Creates a permission handler object.
     * @param {NetworkState} state the current NetworkState object.
     * @param {number} admin the role number to consider an admin (always has permissions).
     */
    constructor(state: NetworkState, admin: number) {
        this.state = state;
        this.admin = admin;
    }

    /**
     * Checks to ensure that the supplied user has the role specified, or a higher one.
     * @param {string} user The address of the user.
     * @param {number} role The role that the user should supercede or be equal to.
     * @throws {ContractError} if the user doesn't have the correct permissions.
     */
    requireTieredRole(user: string, role: number): void {
        const wallet: RosettaWallet = this.state.wallets[user];
        const userRole = wallet?.role ?? 0;
        if(userRole == this.admin) return;
        if(role > userRole) throw new ContractError("User does not have permission for this role.");
    }

    /**
     * Checks to ensure that the supplied user has specifically the role specified, or a higher one.
     * @param {string} user The address of the user.
     * @param {number} role The role that the user should have.
     * @throws {ContractError} if the user doesn't have the correct permissions.
     */
    requireSpecificRole(user: string, role: number): void {
        const wallet: RosettaWallet = this.state.wallets[user];
        const userRole = wallet?.role ?? 0;
        if(userRole == this.admin) return;
        if(role !== userRole) throw new ContractError("User does not have permission for this role.");
    }

    /**
     * Checks to ensure that the supplied user has a role within the roles provided.
     * @param {string} user The address of the user.
     * @param {number[]} roles The roles that have permission to the action you're checking.
     * @throws {ContractError} if the user doesn't have the correct permissions.
     */
    requireRoleFromList(user: string, roles: number[]): void {
        const wallet: RosettaWallet = this.state.wallets[user];
        const userRole = wallet?.role ?? 0;
        if(userRole == this.admin) return;
        if(!roles.includes(userRole)) throw new ContractError("User does not have permission for this role.");
    }
}