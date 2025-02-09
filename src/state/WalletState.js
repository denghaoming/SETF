import Web3 from 'web3'
import { CHAIN_ID, CHAIN_SYMBOL, CHAIN_ERROR_TIP } from '../abi/config'
class WalletState {
    wallet = {
        chainId: null,
        account: null,
        lang: "EN"
    }

    config = {
        //test
        // MintPool: "0xA446A2A650E1c285B64a446D051983FB3b9209Cc",
        // BurnPool:"0x0d069bf40C457f4b289De37CCF48DfEB87A8741F",
        //bsc
        MintPool: "0x7a72e51F7EFE18259cBfe9A763520AA0831B9953",
        BurnPool: "0x697590428a28671AC0b5D448f3C55CBB2f3DDd83",
        Sale:"0x2F429C90983076363E16EA8D3Ab69d6842b88Ad3"
    }

    listeners = []

    constructor() {
        this.subcripeWeb3();
        this.getConfig();
    }
    //listen the wallet event
    async subcripeWeb3() {
        let page = this;
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', function (accounts) {
                page.connetWallet();
                // window.location.reload();
            });
            window.ethereum.on('chainChanged', function (chainId) {
                page.connetWallet();
                page.getConfig();
                // window.location.reload();
            });
        }
        // window.ethereum.on('connect', (connectInfo) => { });
        // window.ethereum.on('disconnect', (err) => { });
        // window.ethereum.isConnected();

        //         4001
        // The request was rejected by the user
        // -32602
        // The parameters were invalid
        // -32603
        // Internal error
    }

    async getConfig() {
        if (!Web3.givenProvider) {
            console.log("not wallet found");
        }

        var storage = window.localStorage;
        if (storage) {
            var lang = storage["lang"];
            if (lang) {
                this.wallet.lang = lang;
            }
        }
        this.notifyAll();
    }

    async connetWallet() {
        let provider = Web3.givenProvider || window.ethereum;
        if (provider) {
            Web3.givenProvider = provider;
            const web3 = new Web3(provider);
            const chainId = await web3.eth.getChainId();
            this.wallet.chainId = chainId;
            const accounts = await web3.eth.requestAccounts();
            this.wallet.account = accounts[0];
            //Test
            // this.wallet.account = "0x61a8A8952ACca983064CBd1ebab87AfD84C34538";
            this.notifyAll();
        } else {
            setTimeout(() => {
                this.connetWallet();
            }, 3000);
            // window.location.reload();
        }
    }

    changeLang(lang) {
        this.wallet.lang = lang;
        var storage = window.localStorage;
        if (storage) {
            storage["lang"] = lang;
        }
        this.notifyAll();
    }

    onStateChanged(cb) {
        this.listeners.push(cb);
    }

    removeListener(cb) {
        this.listeners = this.listeners.filter(item => item !== cb);
    }

    notifyAll() {
        for (let i = 0; i < this.listeners.length; i++) {
            const cb = this.listeners[i];
            cb();
        }
    }

}
export { CHAIN_ID, CHAIN_SYMBOL, CHAIN_ERROR_TIP };
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MAX_INT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
export default new WalletState();