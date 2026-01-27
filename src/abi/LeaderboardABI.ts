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
    {
        "inputs": [
            { "internalType": "address", "name": "newOwner", "type": "address" }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
        "description": "Transfer ownership (owner only)"
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
    {
        "inputs": [
            { "internalType": "address", "name": "player", "type": "address" },
            { "internalType": "string", "name": "difficulty", "type": "string" }
        ],
        "name": "getPlayerStats",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "highScore", "type": "uint256" },
                    { "internalType": "uint256", "name": "rank", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalPlayers", "type": "uint256" },
                    { "internalType": "uint256", "name": "lastSubmission", "type": "uint256" }
                ],
                "internalType": "struct Leaderboard.PlayerStats",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "description": "Get all player stats in a single call (optimized for frontend)"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "difficulty", "type": "string" },
            { "internalType": "address", "name": "player", "type": "address" }
        ],
        "name": "lastSubmissionTime",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function",
        "description": "Get last submission timestamp for a player"
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
    },
] as const
