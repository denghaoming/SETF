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