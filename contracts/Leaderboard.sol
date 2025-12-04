// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Leaderboard
 * @notice On-chain leaderboard for Agnej game with Linea PoH V2 verification
 * @dev Stores high scores with ranking support and human verification via Verax attestations
 */

/**
 * @dev Interface for Linea's PoHVerifier contract
 * Verifies signatures from Linea's PoH V2 API
 */
interface IPoHVerifier {
    function verify(bytes calldata signature, address account) external returns (bool);
}

contract Leaderboard {
    // ============ Events ============
    
    event ScoreSubmitted(
        address indexed player, 
        string difficulty, 
        uint256 score, 
        uint256 timestamp
    );
    
    event NewHighScore(
        address indexed player, 
        string difficulty, 
        uint256 score
    );

    event PlayerVerified(address indexed player, uint256 timestamp);

    // ============ Structs ============
    
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 timestamp;
        bool isVerified;
    }

    // ============ State Variables ============
    
    // Difficulty -> Player -> High Score
    mapping(string => mapping(address => uint256)) public highScores;
    
    // Difficulty -> List of all players who have scores
    mapping(string => address[]) private players;
    
    // Difficulty -> Player -> Index in players array (for existence check)
    mapping(string => mapping(address => uint256)) private playerIndex;
    
    // Difficulty -> Player -> Has submitted at least once
    mapping(string => mapping(address => bool)) private hasSubmitted;

    // PoH Verification (opt-in via Linea PoH V2)
    mapping(address => bool) public isVerified;
    IPoHVerifier public pohVerifier = IPoHVerifier(0xBf14cFAFD7B83f6de881ae6dc10796ddD7220831);
    address public owner;

    // ============ Constructor ============
    constructor() {
        owner = msg.sender;
    }

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ============ Public Functions ============

    /**
     * @notice Verify user via signed PoH status from Linea PoH V2 API
     * @dev Uses the PohVerifier contract to validate signatures from Linea's signer API
     * @param signature The signed PoH status from https://poh-signer-api.linea.build/poh/v2/{address}
     */
    function verifyPoHSigned(bytes calldata signature) external {
        require(!isVerified[msg.sender], "Already verified");
        require(pohVerifier.verify(signature, msg.sender), "Invalid PoH signature");
        isVerified[msg.sender] = true;
        emit PlayerVerified(msg.sender, block.timestamp);
    }

    /**
     * @notice Backend oracle marks a user as verified after offchain API check
     * @dev Only callable by owner (oracle service)
     * @param player The address to verify
     */
    function verifyPoHOffchain(address player) external onlyOwner {
        require(!isVerified[player], "Already verified");
        isVerified[player] = true;
        emit PlayerVerified(player, block.timestamp);
    }

    /**
     * @notice Legacy verifyHuman function - deprecated, use verifyPoHSigned instead
     * @dev Kept for backwards compatibility
     */
    function verifyHuman() external {
        require(!isVerified[msg.sender], "Already verified");
        // For MVP: allow self-verification
        // In production: use verifyPoHSigned() with Linea PoH V2
        isVerified[msg.sender] = true;
        emit PlayerVerified(msg.sender, block.timestamp);
    }

    /**
     * @notice Update the PoHVerifier contract address
     * @dev Only callable by owner
     */
    function setPohVerifier(address _pohVerifier) external onlyOwner {
        require(_pohVerifier != address(0), "Invalid address");
        pohVerifier = IPoHVerifier(_pohVerifier);
    }

    /**
     * @notice Transfer ownership
     * @dev Only callable by owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Submit a score for the specified difficulty
     * @param difficulty The difficulty level (EASY, MEDIUM, HARD)
     * @param score The score achieved
     */
    function submitScore(string memory difficulty, uint256 score) external {
        require(bytes(difficulty).length > 0, "Invalid difficulty");
        require(score > 0, "Score must be greater than 0");
        
        uint256 currentHighScore = highScores[difficulty][msg.sender];
        
        // Track player if first submission for this difficulty
        if (!hasSubmitted[difficulty][msg.sender]) {
            playerIndex[difficulty][msg.sender] = players[difficulty].length;
            players[difficulty].push(msg.sender);
            hasSubmitted[difficulty][msg.sender] = true;
        }
        
        // Always emit the submission event for the global log
        emit ScoreSubmitted(msg.sender, difficulty, score, block.timestamp);

        // If this is a personal best, update state and emit high score event
        if (score > currentHighScore) {
            highScores[difficulty][msg.sender] = score;
            emit NewHighScore(msg.sender, difficulty, score);
        }
    }

    /**
     * @notice Get a player's high score for a specific difficulty
     * @param player The player's address
     * @param difficulty The difficulty level
     * @return The player's high score (0 if never played)
     */
    function getHighScore(address player, string memory difficulty) 
        external 
        view 
        returns (uint256) 
    {
        return highScores[difficulty][player];
    }

    /**
     * @notice Get top N scores for a difficulty level
     * @param difficulty The difficulty level
     * @param count Maximum number of scores to return
     * @param verifiedOnly If true, only return verified players
     * @return Array of ScoreEntry structs, sorted highest to lowest
     */
    function getTopScores(string memory difficulty, uint256 count, bool verifiedOnly) 
        external 
        view 
        returns (ScoreEntry[] memory) 
    {
        address[] memory allPlayers = players[difficulty];
        uint256 totalPlayers = allPlayers.length;
        
        if (totalPlayers == 0) {
            return new ScoreEntry[](0);
        }
        
        // Filter and create array
        uint256 validCount = 0;
        for (uint256 i = 0; i < totalPlayers; i++) {
            if (!verifiedOnly || isVerified[allPlayers[i]]) {
                validCount++;
            }
        }

        if (validCount == 0) {
            return new ScoreEntry[](0);
        }

        ScoreEntry[] memory allScores = new ScoreEntry[](validCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < totalPlayers; i++) {
            address player = allPlayers[i];
            if (!verifiedOnly || isVerified[player]) {
                allScores[idx] = ScoreEntry({
                    player: player,
                    score: highScores[difficulty][player],
                    timestamp: 0,
                    isVerified: isVerified[player]
                });
                idx++;
            }
        }
        
        // Sort descending
        for (uint256 i = 0; i < validCount; i++) {
            for (uint256 j = i + 1; j < validCount; j++) {
                if (allScores[j].score > allScores[i].score) {
                    ScoreEntry memory temp = allScores[i];
                    allScores[i] = allScores[j];
                    allScores[j] = temp;
                }
            }
        }
        
        // Return top N
        uint256 returnCount = count < validCount ? count : validCount;
        ScoreEntry[] memory topScores = new ScoreEntry[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            topScores[i] = allScores[i];
        }
        
        return topScores;
    }

    /**
     * @notice Get a player's rank for a specific difficulty
     * @param player The player's address
     * @param difficulty The difficulty level
     * @param verifiedOnly If true, rank only among verified players
     * @return rank The player's rank (1 = best, 0 = unranked/never played)
     */
    function getPlayerRank(address player, string memory difficulty, bool verifiedOnly) 
        external 
        view 
        returns (uint256 rank) 
    {
        if (!hasSubmitted[difficulty][player]) {
            return 0;
        }
        
        uint256 playerScore = highScores[difficulty][player];
        if (playerScore == 0) {
            return 0;
        }

        // If filtering by verified and player isn't verified, return 0
        if (verifiedOnly && !isVerified[player]) {
            return 0;
        }
        
        address[] memory allPlayers = players[difficulty];
        uint256 totalPlayers = allPlayers.length;
        
        rank = 1;
        for (uint256 i = 0; i < totalPlayers; i++) {
            address otherPlayer = allPlayers[i];
            if (otherPlayer != player) {
                // Skip if filtering by verified and other player isn't verified
                if (verifiedOnly && !isVerified[otherPlayer]) {
                    continue;
                }
                if (highScores[difficulty][otherPlayer] > playerScore) {
                    rank++;
                }
            }
        }
        
        return rank;
    }

    /**
     * @notice Get total number of players for a difficulty
     * @param difficulty The difficulty level
     * @param verifiedOnly If true, count only verified players
     * @return Total number of unique players who have submitted scores
     */
    function getTotalPlayers(string memory difficulty, bool verifiedOnly) 
        external 
        view 
        returns (uint256) 
    {
        if (!verifiedOnly) {
            return players[difficulty].length;
        }

        uint256 count = 0;
        address[] memory allPlayers = players[difficulty];
        for (uint256 i = 0; i < allPlayers.length; i++) {
            if (isVerified[allPlayers[i]]) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Get all players for a difficulty (for external queries)
     * @param difficulty The difficulty level
     * @return Array of player addresses
     */
    function getAllPlayers(string memory difficulty) 
        external 
        view 
        returns (address[] memory) 
    {
        return players[difficulty];
    }
}
