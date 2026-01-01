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
            { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "name": "verifyPoHSigned",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
        "description": "Verify user via signed PoH status from Linea PoH V2 API"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "player", "type": "address" }
        ],
        "name": "verifyPoHOffchain",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
        "description": "Backend oracle marks a user as verified after offchain API check"
    },
    {
        "inputs": [],
        "name": "verifyHuman",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
        "description": "Legacy function - deprecated, use verifyPoHSigned instead"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_pohVerifier", "type": "address" }
        ],
        "name": "setPohVerifier",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
        "description": "Update the PoHVerifier contract address (owner only)"
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
            { "internalType": "address", "name": "player", "type": "address" }
        ],
        "name": "isVerified",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
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
            { "internalType": "uint256", "name": "count", "type": "uint256" },
            { "internalType": "bool", "name": "verifiedOnly", "type": "bool" }
        ],
        "name": "getTopScores",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "player", "type": "address" },
                    { "internalType": "uint256", "name": "score", "type": "uint256" },
                    { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
                    { "internalType": "bool", "name": "isVerified", "type": "bool" }
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
            { "internalType": "string", "name": "difficulty", "type": "string" },
            { "internalType": "bool", "name": "verifiedOnly", "type": "bool" }
        ],
        "name": "getPlayerRank",
        "outputs": [{ "internalType": "uint256", "name": "rank", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "difficulty", "type": "string" },
            { "internalType": "bool", "name": "verifiedOnly", "type": "bool" }
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
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "PlayerVerified",
        "type": "event"
    }
] as const
