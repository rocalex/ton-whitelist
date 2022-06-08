import * as fs from 'fs'
import * as dotenv from 'dotenv'
import TonWeb from "tonweb";
import * as tonMnemonic from 'tonweb-mnemonic'
import { BridgeContract } from './contracts';

dotenv.config();

const provider = new TonWeb.HttpProvider(process.env.TONCENTER_RPC_URL, { apiKey: process.env.TONCENTER_API_KEY })
const tonWeb = new TonWeb(provider);
const enc = new TextEncoder();

const WalletClass = tonWeb.wallet.all['v3R2'];
const Address = TonWeb.Address
const NftCollection = TonWeb.token.nft.NftCollection;
const NftItem = TonWeb.token.nft.NftItem;

(async () => {
    const privateKey = Buffer.from(process.env.ED25519_SK || "", "hex");
    const strAddress = fs.readFileSync(__dirname + "/../build/contract_address").toString().split(' ')[1]
    const bridge = new BridgeContract(provider, { address: strAddress, ed25519PrivateKey: privateKey })
    const bridgeAddress = await bridge.getAddress()
    console.log('bridge address=', bridgeAddress.toString(true, true, true));

    const args = process.argv.slice(2)

    if (args[0] == 'setup') {
        const signerMnemonic = process.env.SIGNER_MN || ""
        const keyPair = await tonMnemonic.mnemonicToKeyPair(signerMnemonic.split(" "))

        const wallet = new WalletClass(provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        const walletAddress = await wallet.getAddress()
        console.log("wallet address =", walletAddress.toString(true, true, true))

        const seqno = (await wallet.methods.seqno().call()) || 0

        const payload = await bridge.createSetupBody()

        const transfer = wallet.methods.transfer({
            secretKey: keyPair.secretKey,
            toAddress: bridgeAddress,
            amount: TonWeb.utils.toNano('0.01'),
            seqno: seqno,
            payload: payload
        })

        console.log(await transfer.send())
    } else if (args[0] == 'whitelist') {
        const signerMnemonic = process.env.SIGNER_MN || ""
        const keyPair = await tonMnemonic.mnemonicToKeyPair(signerMnemonic.split(" "))

        const wallet = new WalletClass(provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        const walletAddress = await wallet.getAddress()
        console.log("wallet address =", walletAddress.toString(true, true, true))

        const actionId = 10

        const payload = await bridge.createWhitelistBody({
            actionId,
            collection: new Address(args[1])
        })

        const seqno = (await wallet.methods.seqno().call()) || 0
        const amount = TonWeb.utils.toNano('0.01')
        const transfer = wallet.methods.transfer({
            secretKey: keyPair.secretKey,
            toAddress: bridgeAddress,
            amount: amount,
            seqno: seqno,
            payload: payload,
            sendMode: 3
        })

        console.log(await transfer.send())
    }
})();