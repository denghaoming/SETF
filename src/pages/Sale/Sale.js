import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "./Presale.css"
import WalletState, { ZERO_ADDRESS, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { ERC20_ABI } from "../../abi/erc20"
import { Sale_ABI } from '../../abi/Sale_ABI'
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
        inputAmount: '',
        inviteFees: [],
        tokenRewardList: tokenRewardList,
        partnerRewardList: partnerRewardList,
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
    //20秒刷新一次数据
    refreshInfo() {
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
        this._refreshInfoIntervel = setInterval(() => {
            this.getInfo();
        }, 20000);
    }

    //获取数据
    async getInfo() {
        try {
            const web3 = new Web3(Web3.givenProvider);
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.MintPool);

            //获取基本信息
            const baseInfo = await poolContract.methods.getBaseInfo().call();
            //usdt合约
            let usdtAddress = baseInfo[0];
            //usdt精度
            let usdtDecimals = parseInt(baseInfo[1]);
            //usdt符号
            let usdtSymbol = baseInfo[2];
            //代币合约
            let tokenAddress = baseInfo[3];
            //代币精度
            let tokenDecimals = parseInt(baseInfo[4]);
            //代币符号
            let tokenSymbol = baseInfo[5];
            //区块时间戳，单位：秒
            let blockTime = parseInt(baseInfo[6]);

            //预售信息
            const saleInfo = await poolContract.methods.getSaleInfo().call();
            //是否暂停
            let pauseBuy = saleInfo[0];
            //1U对应多少币
            let tokenPerUsdt = new BN(saleInfo[1], 10);
            //结束时间
            let endTime = parseInt(saleInfo[2]);
            //最少认购多少U
            let minUsdt = new BN(saleInfo[3], 10);
            //一共多少代币
            let qtyToken = new BN(saleInfo[4], 10);
            //卖了多少代币
            let totalSaleToken = new BN(saleInfo[5], 10);
            //每日释放比例，分母1万，除以100就是百分比
            let releaseRate = parseInt(saleInfo[6]);
            //开始释放时间，为0==预售结束时间
            let startReleaseTime = parseInt(saleInfo[7]);
            if (0 == startReleaseTime) {
                startReleaseTime = endTime;
            }
            //首码地址
            let defaultInvitor = saleInfo[8];
            //合伙人要求兑换数量
            let partnerCondition = new BN(saleInfo[9], 10);
            //推荐奖励比例，0表示1代,分母1万，除以100就是百分比
            let inviteFeesRet = saleInfo[10];
            let len = inviteFeesRet.length;
            let inviteFees = [];
            for (let i = 0; i < len; ++i) {
                inviteFees.push(parseInt(inviteFeesRet[i]) / 100);
            }
            //代币价格
            let tokenPrice = toWei('1', usdtDecimals).mul(toWei('1', tokenDecimals)).div(tokenPerUsdt)
            //销售进度
            let saleProgress = parseInt(new BN(10000).mul(totalSaleToken).div(qtyToken).toNumber()) / 100;

            //分红信息
            const dividendInfo = await poolContract.methods.getDividendInfo().call();
            //全网兑换总量
            let totalTokenAmount = new BN(dividendInfo[0], 10);
            //全网兑换分红
            let totalTokenReward = new BN(dividendInfo[1], 10);
            //合伙人数量
            let partnerAmount = parseInt(dividendInfo[2]);
            //全网合伙人分红
            let totalPartnerReward = new BN(dividendInfo[3], 10);
            //全网分红
            let totalReward = totalTokenReward.add(totalPartnerReward);

            this.setState({
                usdtAddress: usdtAddress,
                usdtSymbol: usdtSymbol,
                usdtDecimals: usdtDecimals,
                tokenAddress: tokenAddress,
                tokenSymbol: tokenSymbol,
                tokenDecimals: tokenDecimals,
                saleCountdownTime: showCountdownTime(endTime - blockTime),
                pauseBuy: pauseBuy,
                tokenPrice: showFromWei(tokenPrice, usdtDecimals, 4),
                defaultInvitor: defaultInvitor,
                blockTime: blockTime,
                endTime: this.formatTime(endTime),
                minUsdt: minUsdt,
                showMinAmount: showFromWei(minUsdt, usdtDecimals, 2),
                releaseRate: releaseRate / 100,
                qtyToken: showFromWei(qtyToken, tokenDecimals, 2),
                saleProgress: saleProgress,
                startReleaseTime: this.formatTime(startReleaseTime),
                inviteFees: inviteFees,
                inviteFee: inviteFees[0],
                inviteFee2: inviteFees[1],
                totalTokenAmount: showFromWei(totalTokenAmount, tokenDecimals, 2),
                totalTokenReward: showFromWei(totalTokenReward, usdtDecimals, 2),
                partnerAmount: partnerAmount,
                totalPartnerReward: showFromWei(totalPartnerReward, usdtDecimals, 2),
                totalReward: showFromWei(totalReward, usdtDecimals, 2),
                partnerCondition: showFromWei(partnerCondition, tokenDecimals, 2),
            });

            let account = WalletState.wallet.account;
            if (account) {
                //获取用户信息
                let userInfoRet = await poolContract.methods.getUserInfo(account).call();
                //usdt余额
                let usdtBalance = new BN(userInfoRet[0], 10);
                //usdt授权额度
                let usdtAllowance = new BN(userInfoRet[1], 10);
                //是否已经激活，激活才能邀请别人，购买，质押都会激活
                let isActive = userInfoRet[2];
                //是否合伙人
                let isPartner = userInfoRet[3];
                //兑换代币数量
                let tokenAmount = new BN(userInfoRet[4], 10);
                //释放代币数量
                let releseToken = new BN(userInfoRet[5], 10);
                //领取代币数量
                let claimedToken = new BN(userInfoRet[6], 10);
                //邀请奖励U
                let inviteReward = new BN(userInfoRet[7], 10);
                //兑换奖励U
                let tokenReward = new BN(userInfoRet[8], 10);
                //合伙人奖励U
                let partnerReward = new BN(userInfoRet[9], 10);
                //待领取代币
                let pendingToken = new BN(0);
                if (releseToken.gt(claimedToken)) {
                    pendingToken = releseToken.sub(claimedToken);
                }

                //用户团队信息
                let userTeamInfo = await poolContract.methods.getUserTeamInfo(account).call();
                //上级
                let invitor = userTeamInfo[0];
                //直推人数
                let binderLen = parseInt(userTeamInfo[1]);
                //团队人数
                let teamNum = parseInt(userTeamInfo[2]);
                this.setState({
                    isActive: isActive,
                    isPartner: isPartner,
                    invitor: invitor,
                    binderLen: binderLen,
                    teamNum: teamNum,
                    usdtBalance: usdtBalance,
                    showUsdtBalance: showFromWei(usdtBalance, usdtDecimals, 2),
                    usdtAllowance: usdtAllowance,
                    tokenAmount: showFromWei(tokenAmount, tokenDecimals, 2),
                    inviteReward: showFromWei(inviteReward, usdtDecimals, 4),
                    tokenReward: showFromWei(tokenReward, usdtDecimals, 4),
                    partnerReward: showFromWei(partnerReward, usdtDecimals, 4),
                })
            }

            //获取每日兑换奖励列表
            let tokenRewardList = [];
            let startIndex = 0;
            let pageSize = 200;
            while (true) {
                //返回的记录是从第一天开始发放奖励，连续每天的数据，就是天数是连续的，有可能奖励是0
                let results = await poolContract.methods
                    .getTokenRewards(startIndex, pageSize)
                    .call();
                let len = results.length;
                for (let i = 0; i < len; ++i) {
                    let item = results[i];
                    let year = parseInt(item.year);
                    let month = parseInt(item.month);
                    let day = parseInt(item.day);
                    let reward = new BN(item.reward, 10);
                    tokenRewardList.push({
                        date: this.formatDate(year, month, day),
                        reward: showFromWei(reward, usdtDecimals, 2),
                    });
                }

                startIndex += pageSize;
                if (len < pageSize) {
                    break;
                }
            }
            this.setState({
                tokenRewardList: tokenRewardList,
            })

            //获取每日合伙人奖励列表
            let partnerRewardList = [];
            startIndex = 0;
            while (true) {
                //返回的记录是从第一天开始发放奖励，连续每天的数据，就是天数是连续的，有可能奖励是0
                let results = await poolContract.methods
                    .getPartnerRewards(startIndex, pageSize)
                    .call();
                let len = results.length;
                for (let i = 0; i < len; ++i) {
                    let item = results[i];
                    let year = parseInt(item.year);
                    let month = parseInt(item.month);
                    let day = parseInt(item.day);
                    let reward = new BN(item.reward, 10);
                    partnerRewardList.push({
                        date: this.formatDate(year, month, day),
                        reward: showFromWei(reward, usdtDecimals, 2),
                    });
                }

                startIndex += pageSize;
                if (len < pageSize) {
                    break;
                }
            }
            this.setState({
                partnerRewardList: partnerRewardList,
            })
        } catch (e) {
            console.log("getInfo", e.message);
            toast.show(e.message);
        } finally {
        }
    }

    //年月日
    formatDate(year, month, day) {
        if (month < 10) {
            month = '0' + month;
        }
        if (day < 10) {
            day = '0' + day;
        }
        return '' + year + month + day;
    }

    //输入监听
    handleInputAmountChange(event) {
        let value = this.inputAmount;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ inputAmount: value });
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.MintPool);
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
            const presaleContract = new web3.eth.Contract(Sale_ABI, WalletState.config.MintPool);
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.MintPool);
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.MintPool);
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.MintPool);
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