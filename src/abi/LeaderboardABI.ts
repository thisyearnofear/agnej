export const LeaderboardABI = [
    // ============ Write Functions ============
    {
        "inputs": [
            { "internalType": "string", "name": "difficulty", "type": "string" },
            { "internalType": "uint256", "name": "score", "type": "uint256" }
        ],
        "name": "submitScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    // ============ Read Functions ============
    {
        "inputs": [
            { "internalType": "address", "name": "player", "type": "address" },
            { "internalType": "string", "name": "difficulty", "type": "string" }
        ],
        "name": "getHighScore",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "difficulty", "type": "string" },
            { "internalType": "uint256", "name": "count", "type": "uint256" }
        ],
        "name": "getTopScores",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "player", "type": "address" },
                    { "internalType": "uint256", "name": "score", "type": "uint256" },
                    { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
                ],
                "internalType": "struct Leaderboard.ScoreEntry[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "player", "type": "address" },
            { "internalType": "string", "name": "difficulty", "type": "string" }
        ],
        "name": "getPlayerRank",
        "outputs": [{ "internalType": "uint256", "name": "rank", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "difficulty", "type": "string" }
        ],
        "name": "getTotalPlayers",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "difficulty", "type": "string" }
        ],
        "name": "getAllPlayers",
        "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
        "stateMutability": "view",
        "type": "function"
    },

    // ============ Events ============
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "difficulty", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "ScoreSubmitted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "difficulty", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" }
        ],
        "name": "NewHighScore",
        "type": "event"
    }
] as const
