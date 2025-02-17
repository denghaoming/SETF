import BN from 'bn.js'
import Web3 from 'web3'

export function fromWei(wei, decimals) {
    if (!wei) {
        return "0";
    }
    var num = new BN(wei, 10).mul(new BN(10).pow(new BN(18 - decimals)));
    return Web3.utils.fromWei(num, 'ether');
}

export function toWei(n, decimals) {
    if (!n) {
        return 0;
    }
    var wei = new BN(Web3.utils.toWei(n, 'ether'), 10)
    return wei.div(new BN(10).pow(new BN(18 - decimals)));
}

export function showFromWei(wei, decimals, dots) {
    let num = fromWei(wei, decimals);
    let index = num.indexOf('.');
    if (index !== -1) {
        num = num.substring(0, dots + index + 1)
    } else {
        num = num.substring(0)
    }
    if (num.endsWith('.')) {
        num = num.substring(0, num.length - 1);
    }
    return num;
}

export function showAccount(account) {
    if (account) {
        return account.substring(2, 4) + "..." + account.substring(account.length - 4, account.length);
    }
    return "";
}

export function showLongAccount(account) {
    if (account) {
        return account.substring(0, 8) + "..." + account.substring(account.length - 8, account.length);
    }
    return "";
}

export function showLongLongAccount(account) {
    if (account) {
        return account.substring(0, 15) + "..." + account.substring(account.length - 13, account.length);
    }
    return "";
}

export function showCountdownTime(time) {
    if (0 >= time) {
        return ["00", "00", "00", "00"];
    }
    var second = time % 60;
    var minutes = parseInt(time / 60);
    var mitute = minutes % 60;
    var hours = parseInt(minutes / 60);
    var hour = hours % 24;
    var day = parseInt(hours / 24);
    if (day < 10) {
        day = "0" + day;
    }

    if (second < 10) {
        second = "0" + second;
    }
    if (mitute < 10) {
        mitute = "0" + mitute;
    }
    if (hour < 10) {
        hour = "0" + hour;
    }

    return [day, hour, mitute, second];
}

//保存链接里的邀请人在浏览器的缓存中,单页面应用，应用入口组件处调用
export function saveRef() {
    var url = window.location.href;
    var obj = new Object();
    var scan_url = url.split("?");
    if (2 <= scan_url.length) {
        let refParams = '';
        for (let i = 1; i < scan_url.length; ++i) {
            refParams = scan_url[i];
            if (refParams.includes('ref')) {
                break;
            }
        }

        var strs = refParams.split("&");
        for (var x in strs) {
            var arr = strs[x].split("=");
            obj[arr[0]] = arr[1];
            //邀请人保存在浏览器的 localStorage 里
            if ("ref" == arr[0] && arr[1]) {
                console.log("saveRef", arr[1].replace("/", ""));
                var storage = window.localStorage;
                if (storage) {
                    storage["ref"] = arr[1].replace("/", "");
                }
            }
        }
    }
    return obj;
}

//获取邀请人
export function getRef() {
    //先从链接获取，如果有，直接使用
    var url = window.location.href;
    var obj = new Object();
    var scan_url = url.split("?");
    if (2 <= scan_url.length) {
        let refParams = '';
        for (let i = 1; i < scan_url.length; ++i) {
            refParams = scan_url[i];
            if (refParams.includes('ref')) {
                break;
            }
        }
        var strs = refParams.split("&");
        for (var x in strs) {
            var arr = strs[x].split("=");
            obj[arr[0]] = arr[1];
            //链接里有邀请人
            if ("ref" == arr[0] && arr[1]) {
                console.log("getRef", arr[1].replace("/", ""));
                return arr[1].replace("/", "");
            }
        }
    }
    //从浏览器缓存获取，这里可能部分浏览器不支持
    var storage = window.localStorage;
    if (storage) {
        return storage["ref"];
    }
    return null;
}

const OFFSET19700101 = 2440588;

export function _daysFromDate(year, month, day) {
    if (year < 1970) {
        return 0;
    }
    let _year = parseInt(year);
    let _month = parseInt(month);
    let _day = parseInt(day);

    let __days = parseInt(_day - 32075 + parseInt((1461 * (_year + 4800 + parseInt((_month - 14) / 12))) / 4)
        + parseInt((367 * (_month - 2 - parseInt(((_month - 14) / 12)) * 12)) / 12)
        - parseInt((3 * parseInt(((_year + 4900 + parseInt((_month - 14) / 12)) / 100))) / 4) - OFFSET19700101);
    return __days;
}

export function _daysToDate(
    _days
) {
    let __days = parseInt(_days);

    let L = parseInt(__days + 68569 + OFFSET19700101);
    let N = parseInt((4 * L) / 146097);
    L = parseInt(L - parseInt((146097 * N + 3) / 4));
    let _year = parseInt((4000 * (L + 1)) / 1461001);
    L = parseInt(L - parseInt((1461 * _year) / 4) + 31);
    let _month = parseInt((80 * L) / 2447);
    let _day = parseInt(L - parseInt((2447 * _month) / 80));
    L = parseInt(_month / 11);
    _month = parseInt(_month + 2 - 12 * L);
    _year = parseInt(100 * (N - 49) + _year + L);

    let d = {
        year: _year,
        month: _month,
        day: _day,
    }
    return d;
}