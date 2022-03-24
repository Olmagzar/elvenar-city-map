// vi: ts=4:sw=4:et
let my_username = ''
let my_player_id = ''
let my_world = ''
let city = ''
let worlds = [
    "Arendyll",
    "Winyandor",
    "Felyndral",
    "Khelonaar",
    "Elcysandir",
    "Sinya_Arda",
    "Ceravyn",
    "Harandar"
]

document.addEventListener('click', (e) => {
    if (e.target.id === 'refresh_city') {
        browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
            browser.tabs.sendMessage(tabs[0].id, {'content': 'REFRESH_VALUES'});
        });
    }
})

if (my_player_id === '') {
    browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
        browser.tabs.sendMessage(tabs[0].id, {'content': 'GET_VALUES'});
    });
}

browser.runtime.onMessage.addListener(function (e) {
    data = e.data;
    my_username = data['username']
    my_player_id = data['player_id']
    my_world = data['world']
    city = data['city']
    cur_world = worlds[parseInt(my_world.substr(2)) - 1]
    // assuming country is a two-letters prefix code
    country = my_world.substr(0,2)

    input = document.getElementById('elvenarchitect')
    input.setAttribute('value', city)

    input = document.getElementById('elvenstats')
    input.setAttribute('href', 'https://www.elvenstats.com/player/' + my_world + '/' + my_player_id)

    input = document.getElementById('download_city')
    input.setAttribute('href', 'data:text/plain;charset=utf-8, ' + encodeURIComponent(city))
    input.setAttribute('download', my_username + '-' + cur_world + '-' + country.toUpperCase() + '-city.txt')
});
