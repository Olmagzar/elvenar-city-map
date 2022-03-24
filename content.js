// vi: ts=4 sw=4 et

var s = document.createElement('script');
s.src = browser.extension.getURL('pageScript.js');
(document.head || document.documentElement).appendChild(s);
s.parentNode.removeChild(s);

let my_gateway = 'Unkwown';
let my_world = 'zz1';
let my_username = '';
let my_player_id = '';
let my_city = '';
browser.runtime.onMessage.addListener(respond_city);
function respond_city(message) {
    switch (message.content) {
        case 'GET_VALUES':
            if (my_gateway === "Unkwown") {
                let ev = new CustomEvent('GET_HASH');
                window.dispatchEvent(ev);
            } else {
                browser.runtime.sendMessage({
                    'data': {
                        'username': my_username,
                        'player_id': my_player_id,
                        'world': my_world,
                        'city': my_city,
                    }
                });
            }
            break;
        case 'REFRESH_VALUES':
            my_city = ''
            let ev = new CustomEvent('GET_HASH');
            window.dispatchEvent(ev);
            break;
    }
}

function parse_city(data) {
    responses = JSON.parse(data)
    username = ''
    player_id = ''
    if (my_city === '') {
        city = {
            'city_map': {},
            'user_data': {},
            'ea_data': {
                'cultureBonus': 1.00,
                'completedProvinces': 0,
                'battleSquadsize': 0,
                'encountersPoints': 0,
                'tournamentPoints': 0,
                'producing': [],
                'relicCounts': {},
                'relicBoosts': {}
            }
        }
    } else {
        city = JSON.parse(atob(my_city))
    }
    for (i = 0; i < responses.length; i++) {
        if (responses[i].requestMethod === 'getData' && responses[i].requestClass === 'StartupService') {
            // handle getData responseData
            let d = responses[i].responseData;

            username = d['user_data']['user_name']
            race = d['user_data']['race']
            player_id = d['user_data']['player_id']

            relics = {
                'marble': { 'amount': 0 },
                'steel': { 'amount': 0 },
                'planks': { 'amount': 0 },
                'crystal': { 'amount': 0 },
                'scrolls': { 'amount': 0 },
                'silk': { 'amount': 0 },
                'elixir': { 'amount': 0 },
                'magic_dust': { 'amount': 0 },
                'gems': { 'amount': 0 }
            }
            for (relic in relics) {
                if ('relic_' + relic in d['resources']['resources']) {
                    relics[relic]['amount'] = d['resources']['resources']['relic_' + relic]
                }
            }
            for (j = 0; j < d['relic_boost_good'].length; j++) {
                relic = d['relic_boost_good'][j]
                // Elven Architect does not seem to support Ascended goods yet
                if (relic['good_type'] != 'ascended') {
                    relics[relic['good_id']]['good_type'] = relic['good_type']
                    relics[relic['good_id']]['quality'] = parseInt(relic['quality'])
                }
            }

            relicCounts = []
            for (relic in relics) {
                relicCounts.push({ 'relic_id': relic, 'amount': relics[relic]['amount'] })
            }

            relicBoosts = []
            for (relic in relics) {
                if ('good_type' in relics[relic]) {
                    relicBoosts.push({
                        'good_id': relic,
                        'good_type': relics[relic]['good_type'],
                        'quality': relics[relic]['quality']
                    })
                }
            }

            entities = []
            for (j = 0; j < d['city_map']['entities'].length; j++) {
                entity = d['city_map']['entities'][j]
                ent = {
                    'id': entity['id'],
                    'cityentity_id': entity['cityentity_id'],
                    'x': 0,
                    'y': 0
                }
                if ('x' in entity) {
                    ent['x'] = entity['x']
                }
                if ('y' in entity) {
                    ent['y'] = entity['y']
                }
                if ('stage' in entity) {
                    ent['stage'] = entity['stage']
                }
                entities.push(ent)
            }
            entities = entities.sort(function(a,b) {
                return a.id - b.id;
            });

            unlocked_areas = []
            for (j = 0; j < d['city_map']['unlocked_areas'].length; j++) {
                area = d['city_map']['unlocked_areas'][j]
                a = {
                    'x': 0,
                    'y': 0,
                    'width': area['width'],
                    'length': area['length']
                }
                if ('x' in area) {
                    a['x'] = area['x']
                }
                if ('y' in area) {
                    a['y'] = area['y']
                }
                unlocked_areas.push(a)
            }
            city.city_map['unlocked_areas'] = unlocked_areas
            city.city_map['entities'] = entities
            city.user_data['race'] = race
            if (1.7 >= d['city_culture']['currentProductionModifier'] &&
                1 <= d['city_culture']['currentProductionModifier']) {
                city.ea_data['cultureBonus'] = d['city_culture']['currentProductionModifier']
            } else if (1.7 < d['city_culture']['currentProductionModifier']) {
                city.ea_data['cultureBonus'] = 1.7
            }
            city.ea_data['battleSquadsize'] = d['army_details']['battleClusterSize']
            city.ea_data['relicCounts'] = relicCounts
            city.ea_data['relicBoosts'] = relicBoosts

        } else if (responses[i].requestMethod === 'updateExpansions' && responses[i].requestClass === 'CityMapService') {
            city.ea_data.completedProvinces = responses[i].responseData[2]['cleared_provinces']
        } else if (responses[i].requestMethod === 'getRankingOverview' && responses[i].requestClass === 'RankingService') {
            let d = responses[i].responseData;
            for (j = 0; j < d.length; j++) {
                switch (d[j]['category']) {
                    case 'encounters':
                        city.ea_data['encountersPoints'] = d[j]['score']
                        break;
                    case 'tournament':
                        city.ea_data['tournamentPoints'] = d[j]['score']
                        break;
                }
            }
        } else if (responses[i].requestClass === 'ExceptionService') {
            console.error('POST request returned with an exception')
            console.info(responses[i])
        }
    }
    city_str = JSON.stringify(city)
    city_b64 = btoa(city_str)
    return {
        'username': username,
        'player_id': player_id,
        'city': city_b64,
    }
}

function emitReq(payload) {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', 'https:' + my_gateway);
    xhr.setRequestHeader('Accept', '*/*')
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status == 200) {
            blob = parse_city(xhr.responseText)
            if (my_city === '') {
                my_username = blob['username']
                my_player_id = blob['player_id']
                my_city = blob['city']
                rq = createReq(2, 'getRankingOverview', 'RankingService', [my_player_id])
                forgeRequest(gateway_id, rq);
            } else {
                my_city = blob['city']
                browser.runtime.sendMessage({
                    'data': {
                        'username': my_username,
                        'player_id': my_player_id,
                        'world': my_world,
                        'city': my_city,
                    }
                });
            }
        }
    }
    xhr.send(payload)
}

window.addEventListener('message', function handleSitePost(e) {
    if (e.data.action === 'GOT_HASH') {
        my_gateway = e.data.payload;
        my_world = my_gateway.substr(2).split('.')[0]
        gateway_id = my_gateway.substr(-11)
        rq = createReq(1, 'getData', 'StartupService', []);
        forgeRequest(gateway_id, rq);
    } else if (e.data.action === 'GOT_RQ_MD5') {
        my_payload = e.data.payload;
        emitReq(my_payload)
    }
}, false);

function createReq(reqId, requestMethod, requestClass, requestData) {
    req = [ {
        'requestId': reqId,
        'requestMethod': requestMethod,
        'requestClass': requestClass,
        'requestData': requestData,
        '__clazz__': 'ServerRequestVO'
    } ];
    return req;
}

function forgeRequest(gateway_id, request) {
    let get_key = 'MAW#YB*y06wqz$kTOE';
    let req_str = JSON.stringify(request);
    let concat = gateway_id + get_key + req_str
    window.postMessage({action: 'GET_RQ_MD5', payload: {str: concat, rq: req_str}}, origin)
}
