window.addEventListener('GET_HASH', function getCityInPage(e) {
    if (typeof gameVars !== "undefined" && "json_gateway_url" in gameVars) {
        json_gw_url = atob(gameVars['json_gateway_url']);
    } else {
        json_gw_url = "undefined";
    }
    window.postMessage({action: 'GOT_HASH', payload: json_gw_url}, origin);
}, false);

window.addEventListener('message', function getMD5(e) {
    if (e.data.action === 'GET_RQ_MD5') {
        hash = CryptoJS.MD5(e.data.payload.str).toString().substring(0, 10) + e.data.payload.rq
        window.postMessage({action: 'GOT_RQ_MD5', payload: hash}, origin);
    }
}, false);
