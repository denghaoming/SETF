import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "./Presale.css"
import WalletState, { ZERO_ADDRESS, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { ERC20_ABI } from "../../abi/erc20"
import { Sale_ABI } from '../../abi/Sale_ABI'
import { showCountdownTime, showFromWei, showAccount, toWei, showLongAccount, getRef, showLongLongAccount } from '../../utils'
import BN from 'bn.js'

import moment from 'moment'
import copy from 'copy-to-clipboard';

import Header from '../Header';

class Sale extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
        chainSymbol: 'BNB',
        inputAmount: '',
        inviteFees: [],
        tokenRewardList: [],
        partnerRewardList: [],
        saleCountdownTime: [],
        binderList: [],
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.Sale);

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
            //销毁代币数量
            let destroyToken = new BN(baseInfo[7], 10);

            //预售信息
            const saleInfo = await poolContract.methods.getSaleInfo().call();
            //是否暂停
            let pauseBuy = saleInfo[0];
            //1U对应多少币
            let tokenPerUsdt = new BN(saleInfo[1], 10);
            //最少认购多少U
            let minUsdt = new BN(saleInfo[2], 10);
            //结束时间
            let endTime = parseInt(saleInfo[3]);
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
            let progress = new BN(10000).mul(totalSaleToken).div(qtyToken);
            let saleProgress = parseInt(progress.toNumber()) / 100;

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
                showMinUsdt: showFromWei(minUsdt, usdtDecimals, 2),
                releaseRate: releaseRate / 100,
                totalSaleToken: showFromWei(totalSaleToken, tokenDecimals, 2),
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
                destroyToken: showFromWei(destroyToken, tokenDecimals, 2),
            });

            let startIndex = 0;
            let pageSize = 200;

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
                    pendingToken: showFromWei(pendingToken, tokenDecimals, 4),
                    releseToken: showFromWei(releseToken, tokenDecimals, 4),
                    inviteReward: showFromWei(inviteReward, usdtDecimals, 4),
                    tokenReward: showFromWei(tokenReward, usdtDecimals, 4),
                    partnerReward: showFromWei(partnerReward, usdtDecimals, 4),
                })

                let binderList = [];
                while (true) {
                    let results = await poolContract.methods
                        .getBinderList(account, startIndex, pageSize)
                        .call();
                    let binderRet = results[0];
                    let len = binderRet.length;
                    for (let i = 0; i < len; ++i) {
                        let binder = binderRet[i];

                        binderList.push({
                            binder: binder,
                            showBinder: showLongLongAccount(binder),
                        });
                    }

                    startIndex += pageSize;
                    if (len < pageSize) {
                        break;
                    }
                }
                this.setState({
                    binderList: binderList,
                });
            }

            //获取每日兑换奖励列表
            let tokenRewardList = [];
            startIndex = 0;
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
        let value = this.state.inputAmount;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ inputAmount: value });
    }

    //购买
    async buy() {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        let amount = this.state.inputAmount;
        if (!amount) {
            toast.show("至少购买" + this.state.showMinUsdt);
            return;
        }
        let cost = toWei(amount, this.state.usdtDecimals);
        if (cost.lt(this.state.minUsdt)) {
            toast.show("至少购买" + this.state.showMinUsdt);
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            let usdtBalance = this.state.usdtBalance;
            if (usdtBalance.lt(cost)) {
                toast.show(this.state.usdtSymbol + "余额不足");
                return;
            }
            let approvalNum = this.state.usdtAllowance;
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            //授权额度不够了，需要重新授权
            if (approvalNum.lt(cost)) {
                const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.usdtAddress);
                let estimateGas = await tokenContract.methods.approve(WalletState.config.Sale, MAX_INT).estimateGas({ from: account });
                estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
                let transaction = await tokenContract.methods.approve(WalletState.config.Sale, MAX_INT).send({
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
                //默认首码地址
                invitor = this.state.defaultInvitor;
            }
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.Sale);
            //购买
            let estimateGas = await poolContract.methods.buy(cost, invitor).estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.buy(cost, invitor).send({
                from: account,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("购买成功");
            } else {
                toast.show("购买失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //领取代币
    async claimToken() {
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.Sale);
            let estimateGas = await poolContract.methods.claimToken().estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.claimToken().send({
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

    //领取邀请奖励
    async claimInvite() {
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.Sale);
            let estimateGas = await poolContract.methods.claimInvite().estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.claimInvite().send({
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

    //领取分红
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
            const poolContract = new web3.eth.Contract(Sale_ABI, WalletState.config.Sale);
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
                        <div>预售价格</div>
                        <div>1 {this.state.tokenSymbol} = {this.state.tokenPrice} USDT</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>倒计时</div>
                        <div>{this.state.saleCountdownTime[0]}:{this.state.saleCountdownTime[1]}:{this.state.saleCountdownTime[2]}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>预售总量</div>
                        <div>{this.state.totalSaleToken}/{this.state.qtyToken} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>预售进度</div>
                        <div>{this.state.saleProgress}%</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>我的余额</div>
                        <div>{this.state.showUsdtBalance} {this.state.usdtSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <input className="InputBg flex-1" type="text" value={this.state.inputAmount} onChange={this.handleInputAmountChange.bind(this)} placeholder={'输入购买数量,至少' + this.state.showMinUsdt} pattern="[0-9]*" />
                        <div className='rbutton' onClick={this.buy.bind(this)}>购买</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle '>
                        <div>上级邀请人</div>
                        <div>{showLongAccount(this.state.invitor)}</div>
                    </div>
                    <div className='prettyBg button mt10' onClick={this.invite.bind(this)}>邀请好友</div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>邀请人数</div>
                        <div>{this.state.binderLen}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>团队人数</div>
                        <div>{this.state.teamNum}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>邀请奖励</div>
                        <div>{this.state.inviteReward}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div></div>
                        <div className='rbutton' onClick={this.claimInvite.bind(this)}>领取</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>直推人数</div>
                        <div>{this.state.binderLen}</div>
                    </div>

                    {this.state.binderList.map((item, index) => {
                        return <div className='ModuleContentWitdh RuleTitle mt5'>
                            <div>{index + 1}. {item.showBinder}</div>
                            <div></div>
                        </div>
                    })}
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>合伙人达标</div>
                        <div>{this.state.tokenAmount}/{this.state.partnerCondition}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>是否合伙人</div>
                        <div>{this.state.isPartner ? "是" : "否"}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>释放代币 (结束后每日释放{this.state.releaseRate}%)</div>
                        <div>{this.state.releseToken} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>待领取代币</div>
                        <div>{this.state.pendingToken} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div></div>
                        <div className='rbutton' onClick={this.claimToken.bind(this)}>领取</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>全网销毁</div>
                        <div>{this.state.destroyToken} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>全网分红</div>
                        <div>{this.state.totalReward} {this.state.usdtSymbol}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>兑换分红</div>
                        <div>{this.state.totalTokenReward} {this.state.usdtSymbol}</div>
                    </div>

                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>合伙分红</div>
                        <div>{this.state.totalPartnerReward} {this.state.usdtSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>个人兑换/总量</div>
                        <div>{this.state.tokenAmount}/{this.state.totalSaleToken} {this.state.tokenSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>待领取兑换分红</div>
                        <div>{this.state.tokenReward} {this.state.usdtSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>是否合伙/合伙总数</div>
                        <div>{this.state.isPartner ? "是" : "否"}/{this.state.partnerAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>待领取合伙分红</div>
                        <div>{this.state.partnerReward} {this.state.usdtSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div></div>
                        <div className='rbutton' onClick={this.claim.bind(this)}>领取</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>兑换分红记录</div>
                        <div></div>
                    </div>

                    {this.state.tokenRewardList.map((item, index) => {
                        return <div className='ModuleContentWitdh RuleTitle mt5'>
                            <div>{item.date}</div>
                            <div>{item.reward} {this.state.usdtSymbol}</div>
                        </div>
                    })}
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>合伙分红分红记录</div>
                        <div></div>
                    </div>

                    {this.state.partnerRewardList.map((item, index) => {
                        return <div className='ModuleContentWitdh RuleTitle mt5'>
                            <div>{item.date}</div>
                            <div>{item.reward} {this.state.usdtSymbol}</div>
                        </div>
                    })}
                </div>
                <div className='mt20'></div>
            </div>
        );
    }
}

export default withNavigation(Sale);