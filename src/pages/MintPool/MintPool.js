import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "./Presale.css"
import WalletState, { ZERO_ADDRESS, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { ERC20_ABI } from "../../abi/erc20"
import { MintPool_ABI } from '../../abi/MintPool_ABI'
import { showCountdownTime, showFromWei, showAccount, toWei, showLongAccount, getRef } from '../../utils'
import BN from 'bn.js'

import moment from 'moment'
import copy from 'copy-to-clipboard';

import Header from '../Header';

class MintPool extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
        chainSymbol: 'BNB',
        poolInfos: [],
        depositAmounts: {},
        withdrawAmounts: {},
        stakeAmount: new BN(0),
        nftAmount: new BN(1),
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

    //账户改变监听
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
    //15秒刷新一次数据
    refreshInfo() {
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
        this._refreshInfoIntervel = setInterval(() => {
            this.getInfo();
        }, 15000);
    }

    //获取数据
    async getInfo() {
        try {
            const web3 = new Web3(Web3.givenProvider);
            const poolContract = new web3.eth.Contract(MintPool_ABI, WalletState.config.MintPool);

            //获取基本信息
            const baseInfo = await poolContract.methods.getBaseInfo().call();
            //代币合约
            let tokenAddress = baseInfo[0];
            //代币符号
            let tokenSymbol = baseInfo[1];
            //代币精度
            let tokenDecimals = parseInt(baseInfo[2]);
            //总锁仓数量
            let totalLockAmount = new BN(baseInfo[3], 10);
            //每区块产出，全部池子的
            let rewardPerBlock = new BN(baseInfo[4], 10);
            //总权重
            let totalAllocPoint = parseInt(baseInfo[5]);
            //领取上级奖励比例，分母1万
            let claimInviteFee = parseInt(baseInfo[6]);
            let poolTokenBalance = new BN(baseInfo[7], 10);
            //区块时间戳，单位：秒
            let blockTime = parseInt(baseInfo[8]);
            let poolRewardBalance = poolTokenBalance.sub(totalLockAmount);
            const extInfo = await poolContract.methods.getExtInfo().call();
            let minAmount = new BN(extInfo[0], 10);
            let nftAmount = new BN(extInfo[1], 10);
            this.setState({
                tokenAddress: tokenAddress,
                tokenSymbol: tokenSymbol,
                tokenDecimals: tokenDecimals,
                totalLockAmount: totalLockAmount,
                showTotalLockAmount: showFromWei(totalLockAmount, tokenDecimals, 4),
                rewardPerBlock: rewardPerBlock,
                totalAllocPoint: totalAllocPoint,
                claimInviteFee: claimInviteFee,
                blockTime: blockTime,
                showBlockTime: this.formatTime(blockTime),
                poolRewardBalance: showFromWei(poolRewardBalance, tokenDecimals, 4),
                minAmount: minAmount,
                nftAmount: nftAmount,
                showMinAmount: showFromWei(minAmount, tokenDecimals, 2),
                showNFTAmount: showFromWei(nftAmount, tokenDecimals, 2),
            });

            //获取池子信息，返回多个列表，数据一一对应
            let poolInfoListRet = await poolContract.methods.getAllPoolInfo().call();
            //锁仓周期
            let lockDurations = poolInfoListRet[0];
            //权重
            let allocPoints = poolInfoListRet[1];
            //质押数量
            let totalAmounts = poolInfoListRet[2];
            //累计奖励
            let accRewards = poolInfoListRet[3];
            //已领取奖励
            let claimedRewards = poolInfoListRet[4];
            //邀请奖励
            let inviteRewards = poolInfoListRet[5];

            let poolInfos = [];
            let len = lockDurations.length;
            let oneDays = 86400;
            //全部池子每日产出
            let totalRewardOneDay = new BN(0);
            for (let i = 0; i < len; ++i) {
                let lockDuration = parseInt(lockDurations[i]);
                let allocPoint = parseInt(allocPoints[i]);
                let totalAmount = totalAmounts[i];
                //池子每日产出
                let rewardOneDay = rewardPerBlock.mul(new BN(oneDays / 3)).mul(new BN(allocPoint)).div(new BN(totalAllocPoint));
                poolInfos.push({
                    lockDuration: lockDuration,
                    showLockDuration: parseInt(lockDuration * 10000 / oneDays) / 10000,
                    allocPoint: allocPoint,
                    showRewardOneDay: showFromWei(rewardOneDay, tokenDecimals, 4),
                    showTotalAmount: showFromWei(totalAmount, tokenDecimals, 4),
                });
                totalRewardOneDay = totalRewardOneDay.add(rewardOneDay);
            }
            let userInfos = this.state.userInfos;
            //还没有用户信息
            if (!userInfos) {
                userInfos = {};
                for (let i = 0; i < len; ++i) {
                    userInfos[i] = {};
                }
            }
            this.setState({
                userInfos: userInfos,
                poolInfos: poolInfos,
                showTotalRewardOneDay: showFromWei(totalRewardOneDay, tokenDecimals, 6),
            });

            let account = WalletState.wallet.account;
            if (account) {
                //获取用户信息
                let userInfoRet = await poolContract.methods.getUserInfo(account).call();
                //是否已经激活，激活才能邀请别人，购买，质押都会激活
                let active = userInfoRet[0];
                //上级
                let invitor = userInfoRet[1];
                //下级人数
                let binderLen = parseInt(userInfoRet[2]);
                //代币余额
                let tokenBalance = new BN(userInfoRet[3], 10);
                //代币授权额度
                let tokenAllowance = new BN(userInfoRet[4], 10);
                //质押数量
                let stakeAmount = new BN(userInfoRet[5], 10);
                //累计已领取奖励数量
                let accClaimed = new BN(userInfoRet[6], 10);
                //质押邀请奖励
                let stakeInviteReward = new BN(userInfoRet[7], 10);
                //
                let claimedNFT = userInfoRet[8];
                this.setState({
                    active: active,
                    invitor: invitor,
                    binderLen: binderLen,
                    tokenBalance: tokenBalance,
                    showTokenBalance: showFromWei(tokenBalance, tokenDecimals, 4),
                    tokenAllowance: tokenAllowance,
                    stakeAmount: stakeAmount,
                    showStakeAmount: showFromWei(stakeAmount, tokenDecimals, 4),
                    showAccClaimed: showFromWei(accClaimed, tokenDecimals, 4),
                    showStakeInviteReward: showFromWei(stakeInviteReward, tokenDecimals, 4),
                    claimedNFT: claimedNFT,
                })

                //获取用户所有池子信息
                let allPoolUserInfoRet = await poolContract.methods.getAllPoolUserInfo(account).call();
                //质押数量
                let amounts = allPoolUserInfoRet[0];
                //待领取收益
                let pendings = allPoolUserInfoRet[1];
                //已领取收益
                let claimeds = allPoolUserInfoRet[2];
                //质押时间
                let starts = allPoolUserInfoRet[3];
                //邀请奖励
                let inviteRewards = allPoolUserInfoRet[4];
                //总待领取
                let totalPending = new BN(0);
                for (let i = 0; i < len; ++i) {
                    let amount = new BN(amounts[i], 10);
                    let pending = new BN(pendings[i], 10);
                    let start = parseInt(starts[i]);
                    //解锁时间戳
                    let end = start + poolInfos[i].lockDuration;
                    userInfos[i] = {
                        showAmount: showFromWei(amount, tokenDecimals, 4),
                        showPending: showFromWei(pending, tokenDecimals, 6),
                        showUnclockTime: this.formatTime(end),
                    };
                    totalPending = totalPending.add(pending);
                }
                this.setState({ userInfos: userInfos, showTotalPending: showFromWei(totalPending, tokenDecimals, 6) });
            }
        } catch (e) {
            console.log("getInfo", e.message);
            toast.show(e.message);
        } finally {
        }
    }

    //质押输入监听
    handleDepositAmountChange(id, event) {
        let depositAmounts = this.state.depositAmounts;
        let value = depositAmounts[id];
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        depositAmounts[id] = value;
        this.setState({ depositAmounts: depositAmounts });
    }

    //充值质押
    async deposit(index, e) {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        let amount = this.state.depositAmounts[index];
        let cost = toWei(amount, this.state.tokenDecimals);
        if (cost.lt(this.state.minAmount)) {
            toast.show("至少质押" + this.state.showMinAmount);
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            let tokenBalance = this.state.tokenBalance;
            if (tokenBalance.lt(cost)) {
                toast.show(this.state.tokenSymbol + "余额不足");
                return;
            }
            let approvalNum = this.state.tokenAllowance;
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            //授权额度不够了，需要重新授权
            if (approvalNum.lt(cost)) {
                const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                let estimateGas = await tokenContract.methods.approve(WalletState.config.MintPool, MAX_INT).estimateGas({ from: account });
                estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
                let transaction = await tokenContract.methods.approve(WalletState.config.MintPool, MAX_INT).send({
                    from: account,
                    gas: estimateGas,
                    gasPrice: gasPrice,
                });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }
            //上级
            let invitor = getRef();
            if (!invitor) {
                invitor = ZERO_ADDRESS;
            }
            const poolContract = new web3.eth.Contract(MintPool_ABI, WalletState.config.MintPool);
            //质押
            let estimateGas = await poolContract.methods.deposit(index, cost, invitor).estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.deposit(index, cost, invitor).send({
                from: account,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("质押成功");
            } else {
                toast.show("质押失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //赎回数量监听
    handleWithdrawAmountChange(id, event) {
        let withdrawAmounts = this.state.withdrawAmounts;
        let value = withdrawAmounts[id];
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        withdrawAmounts[id] = value;
        this.setState({ withdrawAmounts: withdrawAmounts });
    }

    //赎回
    async withdraw(index) {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        let amount = this.state.withdrawAmounts[index];
        let cost = toWei(amount, this.state.tokenDecimals);
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            const presaleContract = new web3.eth.Contract(MintPool_ABI, WalletState.config.MintPool);
            let estimateGas = await presaleContract.methods.withdraw(index, cost).estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await presaleContract.methods.withdraw(index, cost).send({
                from: account,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("赎回成功");
            } else {
                toast.show("赎回失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //领取池子收益
    async claim(index) {
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
            const poolContract = new web3.eth.Contract(MintPool_ABI, WalletState.config.MintPool);
            let estimateGas = await poolContract.methods.claim(index).estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.claim(index).send({
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

    //领取全部
    async harvestAll() {
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
            const poolContract = new web3.eth.Contract(MintPool_ABI, WalletState.config.MintPool);
            let estimateGas = await poolContract.methods.harvestAll().estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.harvestAll().send({
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

    //领取NFT
    async claimNFT() {
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
            const poolContract = new web3.eth.Contract(MintPool_ABI, WalletState.config.MintPool);
            let estimateGas = await poolContract.methods.claimNFT().estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.claimNFT().send({
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

    formatTime(timestamp) {
        return moment(new BN(timestamp, 10).mul(new BN(1000)).toNumber()).format("YYYY-MM-DD HH:mm:ss");
    }

    connectWallet() {
        WalletState.connetWallet();
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
            <div className="Presale Token">
                <Header></Header>
                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>质押总量</div>
                        <div>{this.state.showTotalLockAmount} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>每日产出</div>
                        <div>{this.state.showTotalRewardOneDay} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>矿池余额</div>
                        <div>{this.state.poolRewardBalance} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>区块时间</div>
                        <div>{this.state.showBlockTime}</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>我的余额</div>
                        <div>{this.state.showTokenBalance} {this.state.tokenSymbol}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>累计领取</div>
                        <div>{this.state.showAccClaimed} {this.state.tokenSymbol}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>待领取</div>
                        <div>{this.state.showTotalPending} {this.state.tokenSymbol}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div></div>
                        <div className='rbutton' onClick={this.harvestAll.bind(this)}>领取</div>
                    </div>
                </div>
                {this.state.poolInfos.map((item, index) => {
                    return <div className='Module ModuleTop' key={index}>
                        <div className='ModuleContentWitdh RuleTitle'>
                            <div>锁定周期</div>
                            <div>{item.showLockDuration} 天</div>
                        </div>
                        <div className='ModuleContentWitdh RuleTitle mt10'>
                            <input className="InputBg flex-1" type="text" value={this.state.depositAmounts[index]} onChange={this.handleDepositAmountChange.bind(this, index)} placeholder={'输入质押数量,至少' + this.state.showMinAmount} pattern="[0-9.]*" />
                            <div className='rbutton' onClick={this.deposit.bind(this, index)}>质押</div>
                        </div>
                        <div className='ModuleContentWitdh RuleTitle mt20'>
                            <div>我的质押</div>
                            <div>{this.state.userInfos[index].showAmount}</div>
                        </div>

                        <div className='ModuleContentWitdh RuleTitle'>
                            <div>解锁时间</div>
                            <div>{this.state.userInfos[index].showUnclockTime}</div>
                        </div>
                        <div className='ModuleContentWitdh RuleTitle mt10'>
                            <input className="InputBg flex-1" type="text" value={this.state.withdrawAmounts[index]} onChange={this.handleWithdrawAmountChange.bind(this, index)} placeholder={'输入赎回数量'} pattern="[0-9.]*" />
                            <div className='sbutton' onClick={this.withdraw.bind(this, index)}>赎回</div>
                        </div>
                    </div>
                })}
                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>质押{this.state.showNFTAmount}领取NFT，仅可领取一次</div>
                        <div>{this.state.claimedNFT ? "已领取" : this.state.stakeAmount.lt(this.state.nftAmount) ? "未达标" : "达标"}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div></div>
                        <div className='rbutton' onClick={this.claimNFT.bind(this)}>领取</div>
                    </div>
                </div>
                <div className='mt20'></div>
            </div>
        );
    }
}

export default withNavigation(MintPool);