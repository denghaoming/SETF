import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "../MintPool/Token.css"
import "../MintPool/NFT.css"
import WalletState, { CHAIN_ID, ZERO_ADDRESS, CHAIN_ERROR_TIP, CHAIN_SYMBOL, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { ERC20_ABI } from "../../abi/erc20"
import { getRef, showCountdownTime, showFromWei, showLongAccount, toWei } from '../../utils'
import BN from 'bn.js'

import Header from '../Header';
import copy from 'copy-to-clipboard';
import { BurnPool_ABI } from '../../abi/BurnPool_ABI';
import moment from 'moment';

class Burn extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
        invitor: '',
        bnbIn: "",
    }
    constructor(props) {
        super(props);
        this.refreshInfo = this.refreshInfo.bind(this);
    }
    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
        this.refreshInfo();
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
    }

    handleAccountsChanged = () => {
        console.log(WalletState.wallet.lang);
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
            lang: WalletState.wallet.lang,
            local: page.getLocal()
        });
        this.getInfo();
    }

    getLocal() {
        let local = {};
        return local;
    }

    _refreshInfoIntervel;
    refreshInfo() {
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
        this._refreshInfoIntervel = setInterval(() => {
            this.getInfo();
        }, 15000);
    }

    async getInfo() {
        if (WalletState.wallet.chainId != CHAIN_ID) {
            return;
        }
        try {
            const web3 = new Web3(Web3.givenProvider);
            //燃烧合约
            const poolContract = new web3.eth.Contract(BurnPool_ABI, WalletState.config.BurnPool);
            //燃烧池信息
            const poolInfo = await poolContract.methods.getPoolInfo().call();
            //当前燃烧池数量，即参与分红的总BNB数量
            let totalAmount = new BN(poolInfo[0], 10);
            //累计奖励
            let accReward = new BN(poolInfo[1], 10);
            //累计燃烧数量，BNB本位
            let poolAccAmount = new BN(poolInfo[2], 10);
            //累计领取，BNB本位
            let accClaimedAmount = new BN(poolInfo[3], 10);
            //BNB余额
            let poolBalance = new BN(poolInfo[4], 10);
            //单次燃烧BNB最大数量
            let maxAmount = new BN(poolInfo[5], 10);
            //总计奖励=余额+已领取
            let totalReward = accReward;
            let minAmount = new BN(poolInfo[6], 10);
            let maxValidAmount = new BN(poolInfo[7], 10);
            let maxTotalAmount = new BN(poolInfo[8], 10);

            let maxRewardRate = await poolContract.methods._maxRewardRate().call();
            maxRewardRate = parseInt(maxRewardRate);

            this.setState({
                totalAmount: totalAmount,
                showTotalAmount: showFromWei(totalAmount, 18, 6),
                showPoolAccAmount: showFromWei(poolAccAmount, 18, 6),
                showAccClaimedAmount: showFromWei(accClaimedAmount, 18, 6),
                showPoolBalance: showFromWei(poolBalance, 18, 6),
                showTotalReward: showFromWei(totalReward, 18, 6),
                maxAmount: maxAmount,
                showMaxAmount: showFromWei(maxAmount, 18, 6),
                minAmount: minAmount,
                showMinAmount: showFromWei(minAmount, 18, 6),
                maxValidAmount: maxValidAmount,
                showMaxValidAmount: showFromWei(maxValidAmount, 18, 6),
                maxTotalAmount: maxTotalAmount,
                showMaxTotalAmount: showFromWei(maxTotalAmount, 18, 6),
                showMaxRewardRate: maxRewardRate / 10000,
            })

            let account = WalletState.wallet.account;
            if (account) {
                //用户信息
                const userInfo = await poolContract.methods.getUserInfo(account).call();
                //参与分红的燃烧数量
                let amount = new BN(userInfo[0], 10);
                let claimedReward = new BN(userInfo[1], 10);
                //待领取收益
                let pendingReward = new BN(userInfo[2], 10);
                //已领取收益
                let historyReward = new BN(userInfo[3], 10);
                //BNB余额
                let balance = new BN(userInfo[4], 10);
                //累计燃烧BNB数量
                let userAccAmount = new BN(userInfo[5], 10);
                let thisHourAmount = new BN(userInfo[6], 10);

                const userTeamInfo = await poolContract.methods.getUserTeamInfo(account).call();
                //邀请人数
                let inviteNum = parseInt(userTeamInfo[0]);
                //上级
                let invitor = userTeamInfo[1];
                //邀请奖励
                let inviteBNBReward = new BN(userTeamInfo[2], 10);
                let isExit = false;
                let maxReward = amount.mul(new BN(maxRewardRate)).div(new BN(10000));
                let reward = claimedReward.add(pendingReward);
                if (maxReward.gt(new BN(0)) && maxReward.lte(reward)) {
                    isExit = true;
                }
                this.setState({
                    balance: balance,
                    showBalance: showFromWei(balance, 18, 6),
                    showUserAccAmount: showFromWei(userAccAmount, 18, 6),
                    amount: amount,
                    showAmount: showFromWei(amount, 18, 6),
                    showPendingReward: showFromWei(pendingReward, 18, 6),
                    showHistoryReward: showFromWei(historyReward, 18, 6),
                    inviteNum: inviteNum,
                    invitor: invitor,
                    showInviteBNBReward: showFromWei(inviteBNBReward, 18, 6),
                    claimedReward: showFromWei(claimedReward, 18, 6),
                    thisHourAmount: thisHourAmount,
                    showThisHourAmount: showFromWei(thisHourAmount, 18, 6),
                    isExit: isExit,
                })
            }
        } catch (e) {
            console.log("getInfo", e);
            toast.show(e.message);
        } finally {
        }
    }

    //输入框变化，需要多少BNB
    handleBNBInChange(event) {
        let amount = this.state.bnbIn;
        if (event.target.validity.valid) {
            amount = event.target.value;
        }
        this.setState({ bnbIn: amount });
    }

    connectWallet() {
        WalletState.connetWallet();
    }

    //燃烧BNB参与分红
    async burnBNB() {
        if (WalletState.wallet.chainId != CHAIN_ID || !WalletState.wallet.account) {
            toast.show(CHAIN_ERROR_TIP);
            return;
        }
        loading.show();
        try {
            let amount = this.state.bnbIn;
            let payAmount = toWei(amount, 18);
            let account = WalletState.wallet.account;

            if (this.state.balance.lt(payAmount)) {
                toast.show('BNB余额不足');
                return;
            }
            if (!this.state.thisHourAmount.isZero()) {
                toast.show('每小时限参与一次');
                return;
            }
            if (this.state.maxAmount.lt(payAmount)) {
                toast.show('单次限制参与' + this.state.showMaxAmount + 'BNB');
                return;
            }
            if (this.state.minAmount.gt(payAmount)) {
                toast.show('至少参与' + this.state.showMinAmount + 'BNB');
                return;
            }
            if (this.state.maxValidAmount.lt(payAmount.add(this.state.amount))) {
                toast.show('单地址限制参与' + this.state.showMaxValidAmount + 'BNB');
                return;
            }
            if (this.state.maxTotalAmount.lt(payAmount.add(this.state.totalAmount))) {
                toast.show('矿池限制参与' + this.state.showMaxTotalAmount + 'BNB');
                return;
            }
            let invitor = getRef();
            if (!invitor) {
                invitor = ZERO_ADDRESS;
            }
            const web3 = new Web3(Web3.givenProvider);
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            const poolContract = new web3.eth.Contract(BurnPool_ABI, WalletState.config.BurnPool);
            //销毁
            let estimateGas = await poolContract.methods.burnBNB(invitor).estimateGas({ from: account, value: payAmount });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.burnBNB(invitor).send({
                from: account,
                value: payAmount,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("参与成功");
            } else {
                toast.show("参与失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //领取奖励
    async claim() {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            const poolContract = new web3.eth.Contract(BurnPool_ABI, WalletState.config.BurnPool);
            let estimateGas = await poolContract.methods.claim().estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.claim().send({
                from: account,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("领取成功");
            } else {
                toast.show("领取失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //邀请好友
    invite() {
        if (WalletState.wallet.account) {
            var url = window.location.href;
            url = url.split("?")[0];
            let inviteLink = url + "?ref=" + WalletState.wallet.account;
            if (copy(inviteLink)) {
                toast.show("邀请链接已复制")
            } else {
                toast.show("邀请失败")
            }
        }
    }

    render() {
        return (
            <div className="Token NFT">
                <Header></Header>
                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>燃烧BNB {this.state.showMaxRewardRate}倍出局，出局尽快领取，方便继续参与</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>矿池累计燃烧</div>
                        <div>{this.state.showPoolAccAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>燃烧限额</div>
                        <div>{this.state.showMaxTotalAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>当前燃烧</div>
                        <div>{this.state.showTotalAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>总计奖励</div>
                        <div>{this.state.showTotalReward}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>已领取</div>
                        <div>{this.state.showAccClaimedAmount}</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>个人限额</div>
                        <div>{this.state.showMaxValidAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>当前燃烧</div>
                        <div>{this.state.showAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>小时已参与</div>
                        <div>{this.state.showThisHourAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>我的余额</div>
                        <div>{this.state.showBalance}</div>
                    </div>
                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.bnbIn}
                            placeholder={'请输入BNB数量，请输入' + this.state.showMinAmount + '-' + this.state.showMaxAmount}
                            onChange={this.handleBNBInChange.bind(this)} pattern="[0-9.]*" >
                        </input>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.burnBNB.bind(this)}>燃烧</div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>个人累计燃烧</div>
                        <div>{this.state.showUserAccAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>累计领取</div>
                        <div>{this.state.showHistoryReward}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>当前燃烧</div>
                        <div>{this.state.showAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>已领取</div>
                        <div>{this.state.claimedReward}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>待领取{this.state.isExit ? "-出局" : ""}</div>
                        <div>{this.state.showPendingReward}</div>
                    </div>

                    <div className='mt10 prettyBg button' onClick={this.claim.bind(this)}>{this.state.isExit ? "出局-" : ""}领取</div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='prettyBg button' onClick={this.invite.bind(this)}>邀请</div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>邀请人数</div>
                        <div>{this.state.inviteNum}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>邀请奖励</div>
                        <div>{this.state.showInviteBNBReward}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>上级邀请人</div>
                        <div>{showLongAccount(this.state.invitor)}</div>
                    </div>
                </div>
                <div className='mt20'></div>
            </div>
        );
    }
}

export default withNavigation(Burn);