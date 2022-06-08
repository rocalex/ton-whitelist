import * as ed from "@noble/ed25519";
import BN from "bn.js";
import TonWeb, { ContractMethods, ContractOptions } from "tonweb";
import { HttpProvider } from "tonweb/dist/types/providers/http-provider";
import { Address } from "tonweb/dist/types/utils/address";

const Contract = TonWeb.Contract;
const Cell = TonWeb.boc.Cell;

interface BridgeOptions extends ContractOptions {
    ed25519PrivateKey: Buffer
}

interface BridgeMethods extends ContractMethods {
    getPublicKey: () => Promise<BN>;
    isInitialized: () => Promise<BN>;
    getActionId: () => Promise<BN>;
    getWhitelist: () => Promise<any>;
    getCosumedActions: () => Promise<any>;
}

interface WhitelistParams {
    actionId: number | BN;
    collection: Address;
}

export class BridgeContract extends Contract<BridgeOptions, BridgeMethods> {
    constructor(provider: HttpProvider, options: BridgeOptions) {
        super(provider, options);

        this.methods.getPublicKey = this.getPublicKey
        this.methods.isInitialized = this.isInitialized
        this.methods.getActionId = this.getActionId
        this.methods.getWhitelist = this.getWhitelist
        this.methods.getCosumedActions = this.getConsumedActions
    }

    async createSetupBody() {
        const publicKey = await ed.getPublicKey(this.options.ed25519PrivateKey);

        const body = new TonWeb.boc.Cell()
        body.bits.writeUint(0, 32)
        body.bits.writeUint(new BN(publicKey), 256)
        return body
    }

    async createWhitelistBody(params: WhitelistParams) {
        const body = new Cell();
        body.bits.writeUint(7, 32);

        const msg = new Cell()
        msg.bits.writeUint(params.actionId, 32)
        msg.bits.writeAddress(params.collection)

        const msgHashArray = await msg.hash()
        const sigArray = await ed.sign(msgHashArray, this.options.ed25519PrivateKey)
        const publicKey = await ed.getPublicKey(this.options.ed25519PrivateKey)
        const isValid = await ed.verify(sigArray, msgHashArray, publicKey)
        if (!isValid) {
            throw new Error("invalid signature")
        }

        const signature = new TonWeb.boc.Cell()
        signature.bits.writeBytes(sigArray)

        body.refs[0] = msg
        body.refs[1] = signature
        return body;
    }

    getPublicKey = async () => {
        const address = await this.getAddress();
        const result = await this.provider.call2(address.toString(), 'get_public_key');
        return result
    }

    isInitialized = async () => {
        const address = await this.getAddress();
        const result = await this.provider.call2(address.toString(), 'is_initialized');
        return result
    }

    getActionId = async () => {
        const address = await this.getAddress();
        const result = await this.provider.call2(address.toString(), 'get_action_id');
        return result
    }

    getWhitelist = async () => {
        const address = await this.getAddress();
        const result = await this.provider.call2(address.toString(), 'get_whitelist');
        return result
    }

    getConsumedActions = async () => {
        const address = await this.getAddress();
        const result = await this.provider.call2(address.toString(), 'get_consumed_actions');
        return result
    }
}