/*
EVALUATION

- Evaluation Function
- Minimax
*/

function eval(game, playerToMove) {
    // Evaluates a position given by an FEN

    // Evaluation Function takes 27-31 milliseconds -- maybe make more efficient?
    // NOT ANYMORE: now it takes 8-10 ms, of which 6-8 ms is getting the fen.

    const WEIGHTS = [
        [0.83,0.86,0.84,0.86,0.81,0.84,0.86,0.83], // 8th rank (symmetrical though)
        [0.80,0.85,0.83,0.85,0.85,0.83,0.85,0.80],
        [0.80,0.85,0.90,0.85,0.85,0.90,0.85,0.80],
        [0.85,0.90,0.95,1.00,1.00,0.95,0.90,0.85],
        [0.85,0.90,0.95,1.00,1.00,0.95,0.90,0.85],
        [0.80,0.85,0.90,0.85,0.85,0.90,0.85,0.80],
        [0.80,0.85,0.83,0.85,0.85,0.83,0.85,0.80],
        [0.83,0.82,0.84,0.82,0.81,0.84,0.82,0.83]
    ];

    const PAWN_WEIGHTS = [
        [2,2,2,2,2,2,2,2],
        [1.8,1.8,1.8,1.8,1.8,1.8,1.8,1.8], 
        [1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5], 
        [1,1,1.2,1.3,1.3,1.2,1,1],
        [0.80,0.85,0.95,1.00,1.00,0.95,0.85,0.80],
        [0.80,0.85,0.90,0.85,0.85,0.90,0.85,0.80],
        [0.80,0.85,0.80,0.85,0.85,0.80,0.85,0.80],
        [2,2,2,2,2,2,2,2]
    ];

    let fen = game.fen();


    if (game.in_checkmate()) {
        if (playerToMove === 'W') return -100;
        return 100; 
    }
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) return 0;

    // White pieces are capital letters
    // Fen starts with 8th rank

    let result = 0, i = 0, rank = 7, file = 0, char;
    let pieceValues = {
        // 'P': 1,
        'N': 3,
        'B': 3,
        'K': 3,
        'R': 5,
        'Q': 7
    };

    while (fen[i] !== ' ') {
        char = fen[i];
        switch (true) {
            case (char === '/'):
                rank --;
                file = 0;
                break;
            case (char < 'A'):
                file += Number(char);
                break;
            case (char > 'Z'): // lower case: black pieces
                if (char === 'p') {
                    result -= PAWN_WEIGHTS[rank][file];
                } else { 
                    result -= pieceValues[char.toUpperCase()]*WEIGHTS[rank][file];
                }
                file ++;
                break;
            case (char > 'A'): // white pieces
                if (char === 'P') {
                    result += PAWN_WEIGHTS[7-rank][file];
                } else {
                    result += pieceValues[char]*WEIGHTS[rank][file];
                }
                file ++;
                break;
            default:
                console.log('Possible error parsing FEN');
                return result;
        }
        i ++;
    }
    result = Math.round(result * 10000) *0.0001;
    return result;
}

function minimax(game, depth, alpha, beta, player) {
    // No killer
    // game is the game
    // Depth is # ply remaining
    // Player is 'B' or 'W'


    let value, temp, best, len, element;
    if (depth === 0 || game.game_over()){
        return [eval(game, player)];
    }

    // Sorts by move length
    let moves = game.moves().sort((a,b) => b.length - a.length);
    len = moves.length;
    if (player === 'W') {
        value = -Infinity;
        for (let i = 0; i < len; i ++) {
            element = moves[i];
            game.move(element);
            // console.log(`Looking at ${element}`);
            temp = value; // here to detect if value changed. if it did, best element changes
            value = Math.max(value, minimax(game,depth - 1,alpha, beta,'B')[0]);
            alpha = Math.max(alpha, value);
            if (temp < value) best = element;
            game.undo();
            if (alpha >= beta) break;
        }
        return [value, best];
    } else {
        value = Infinity;
        for (let i = 0; i < len; i ++) {
            element = moves[i];
            game.move(element);
            // console.log(`Looking at ${element}`);
            temp = value;
            value = Math.min(value, minimax(game,depth - 1,alpha, beta, 'W')[0]);
            beta = Math.min(beta, value);
            if (temp > value) best = element;
            game.undo();
            if (beta <= alpha) break;
        }
        return [value, best];
    }
}

module.exports = {eval, minimax};

