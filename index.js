var http = require('https');
const { Chess } = require('./node_modules/chess.js');
const { eval, minimax } = require('./evaluation.js');
const EventEmitter = require('events');

const NAME = 'Pulsar64';
const games = {}; // id : [chess object, color]
const options = {
    host: 'lichess.org',
    headers: {
        'Authorization': 'Bearer TOKEN'
    }
}

function streamIncoming() {

    options.path = '/api/stream/event';
    options.method = 'GET';

    const startGameEvent = new EventEmitter();
    startGameEvent.on('challenged', acceptGame); // accepts the challenge
    startGameEvent.on('started', startGame); // starts the game

    const request = http.request(options, (result) => {
        result.on('data', (response) => {
            try {
                let text = response.toString('utf-8');
                if (text.length >= 2) console.log(response.toString('utf-8'));
                let obj = JSON.parse(response);

                let id; 
                switch (obj['type']) {
                    case 'challenge':
                        id = obj['challenge']['id'];
                        let type = obj['challenge']['variant']['name'];
                        let speed = obj['challenge']['speed'];
                        if (type != 'Standard' || speed == "bullet" || speed == "blitz") {
                            declineChallenge(id);
                        }
                        else { startGameEvent.emit('challenged',id); }
                        break;
                    case 'gameStart':
                        id = obj['game']['id'];
                        startGameEvent.emit('started', id);
                        // (id, `Hello!`);
                        break;
                    case 'gameFinish':
                        id = obj['game']['id'];
                        delete games['id'];
                        // let message = 'Good game!';
                        // chat(id, message);
                        break;
                    default:
                }
            }
            catch(err) {
                if (err.name !== 'SyntaxError') console.log(err);
            }
        });
    });
    request.end();
    return;
}

function acceptGame(id) {
    // This function is called when the bot is challenged
    // It accepts the challenge
    acceptChallenge(id);
    // games[id] = new Chess();
    return;
}

function startGame(id) {
    // This function is called when the game starts.
    if (!games[id]) games[id] = [new Chess(),];

    streamGame(id);
    return;
}

function streamGame(id) {
    options.path = `/api/bot/game/stream/${id}`;
    options.method = 'GET';

    const moveReceived = new EventEmitter();
    moveReceived.on('move', updateOppMove);
    moveReceived.on('move', respondMove);
    moveReceived.on('immediateMove', respondMove);

    const request = http.request(options, (result) => {
        result.on('data', (response) => {
            try {
                // New data received
                let text = response.toString('utf-8');
                if (text.length >= 2) console.log(response.toString('utf-8'));
                let obj = JSON.parse(response);

                switch (obj['type']) {
                    case 'gameFull':
                        let color = (obj["white"]["name"] === NAME) ? 'white' : 'black';
                        games[id][1] = color;
                        if (obj['state']['moves'] !== "") {
                            // disconnect handling
                            let splitMoveArr = obj['state']['moves'].split(" ");
                            splitMoveArr.forEach(move => games[id][0].move(move, {sloppy: true}));
                            let colorNum = (games[id][1] === 'white') ? 0 : 1;
                            if (splitMoveArr.length % 2 === colorNum) moveReceived.emit('immediateMove',id);
                            break;
                        } else {
                            if (color === 'white') moveReceived.emit('immediateMove', id);
                            break;
                        }
                    case 'gameState':
                        if (obj['winner']) break;

                        let fullMoves = obj['moves'];
                        let splitMoveArr = fullMoves.split(' ');
                        let colorNum = (games[id][1] === 'white') ? 1 : 0;

                        if (splitMoveArr.length % 2 === colorNum) break; // user's move

                        let received = splitMoveArr[splitMoveArr.length - 1];
                        console.log(`RECIEVED MOVE: ${received}`);
                        moveReceived.emit('move', id, received, splitMoveArr); // updates opp move, then responds
                        break;
                    case 'chatLine':
                        // handle this
                        break;
                }
            }
            catch(err) {
                if (err.name !== 'SyntaxError') console.log(err);
            }
        });
    });
    request.end();
    return;
}

function updateOppMove(id, received) {
    // This function makes the opponent's move on the chess board.
    let chess = games[id][0];
    received = received.substr(0,4);
    chess.move(received, {sloppy: true});
    return;
}

function respondMove(id) {
    let move = selectMove(id);
    makeMove(move, id);
}

function acceptChallenge(id) {
    options.path = `/api/challenge/${id}/accept`;
    options.method = 'POST';

    const request = http.request(options, (result) => {
        result.on('data', (response) => {
            console.log(response.toString('utf8'));
        });
    });
    request.end();

    return;
}

function declineChallenge(id) {
    options.path = `/api/challenge/${id}/decline`;
    options.method = 'POST';

    console.log('Challenge declined.');

    const request = http.request(options, (result) => {
        result.on('data', (response) => {
            console.log(response.toString('utf8'));
        });
    });
    request.end();

    return;
}

function makeMove(move, id) {
    // Move: e2e4

    options.path = `/api/bot/game/${id}/move/${move}`;
    options.method = 'POST';

    const request = http.request(options, (result) => {
        result.on('data', (response) => {
            console.log(response.toString('utf8'));
        });
    });

    request.end();

    return;
}

function resignGame(id) {
    options.path = `/api/bot/game/${id}/resign`;
    options.method = 'POST';

    const request = http.request(options, (result) => {
        result.on('data', (response) => {
            console.log(response.toString('utf8'));
        });
    });

    request.end();
}

/* function chat(id, message) {
    post_data = JSON.stringify({
        'room': 'player', 
        'text': message
    });

    options.path = `/api/bot/game/${id}/chat`;
    options.method = 'POST';
    // options.headers['Transfer-Encoding'] = 'chunked';
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    // options.headers['Content-Length'] = Buffer.byteLength(post_data);

    const request = http.request(options, (result) => {
        result.on('data', (response) => {
            console.log(response.toString('utf8'));
        });
    });
    request.write(post_data);    
    request.end();
}  */

function selectMove(id) {
    const SEARCH_DEPTH = 4;
    // Pre-Sorting Stats
    // 3 ply ~ 350-500 ms/move
    // 4 ply > 60000 ms/move

    // Now, with sorting by length of move (prioritizes captures)
    // 3 ply ~ 800-1000 ms/move
    // 4 ply ~ 4000 ms/move, in certain cases can to 30 sec or more
    // 5 ply ~ 112 seconds

    // With killers
    // 4 ply ~ about same as before
    // 5 ply ~ 60s
    let chess = games[id][0];
    let moveInfo = minimax(chess, SEARCH_DEPTH, -Infinity, Infinity, chess.turn().toUpperCase());
    let moveObject = chess.move(moveInfo[1], {sloppy: true});
    console.log(`Evaluation after ${moveInfo[1]}: ${moveInfo[0]}`);
    let formattedMove;
    if (moveObject && moveObject.promotion) {
        formattedMove = `${moveObject.from}${moveObject.to}${moveObject.promotion.toLowerCase()}`;
    } else {
        formattedMove = `${moveObject.from}${moveObject.to}`;
    }
    return formattedMove;
}

streamIncoming();