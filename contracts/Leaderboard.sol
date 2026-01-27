// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Leaderboard
 * @notice On-chain leaderboard for Agnej game
 * @dev Stores high scores with ranking support
 * @dev Optimized for gas efficiency and frontend integration
 */

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


    // ============ Structs ============
    
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    struct PlayerStats {
        uint256 highScore;
        uint256 rank;
        uint256 totalPlayers;
        uint256 lastSubmission;
    }

    // ============ State Variables ============
    
    // Difficulty -> Player -> High Score
    mapping(string => mapping(address => uint256)) public highScores;
    
    // Difficulty -> Player -> Last submission timestamp
    mapping(string => mapping(address => uint256)) public lastSubmissionTime;
    
    // Difficulty -> List of all players who have scores
    mapping(string => address[]) private players;
    
    // Difficulty -> Player -> Index in players array (for existence check)
    mapping(string => mapping(address => uint256)) private playerIndex;
    
    // Difficulty -> Player -> Has submitted at least once
    mapping(string => mapping(address => bool)) private hasSubmitted;

    address public owner;
    
    // Anti-cheat: Maximum possible score per difficulty
    uint256 public constant MAX_SCORE_EASY = 50000;
    uint256 public constant MAX_SCORE_MEDIUM = 50000;
    uint256 public constant MAX_SCORE_HARD = 50000;
    
    // Rate limiting: Minimum time between submissions (prevents spam)
    uint256 public constant MIN_SUBMISSION_INTERVAL = 10; // 10 seconds

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
        
        // Anti-cheat: Validate score is within reasonable bounds
        uint256 maxScore = _getMaxScore(difficulty);
        require(score <= maxScore, "Score exceeds maximum for difficulty");
        
        // Rate limiting: Prevent submission spam
        uint256 lastSubmission = lastSubmissionTime[difficulty][msg.sender];
        require(
            block.timestamp >= lastSubmission + MIN_SUBMISSION_INTERVAL,
            "Please wait before submitting again"
        );
        
        uint256 currentHighScore = highScores[difficulty][msg.sender];
        
        // Track player if first submission for this difficulty
        if (!hasSubmitted[difficulty][msg.sender]) {
            playerIndex[difficulty][msg.sender] = players[difficulty].length;
            players[difficulty].push(msg.sender);
            hasSubmitted[difficulty][msg.sender] = true;
        }
        
        // Update last submission time
        lastSubmissionTime[difficulty][msg.sender] = block.timestamp;
        
        // Always emit the submission event for the global log
        emit ScoreSubmitted(msg.sender, difficulty, score, block.timestamp);

        // If this is a personal best, update state and emit high score event
        if (score > currentHighScore) {
            highScores[difficulty][msg.sender] = score;
            emit NewHighScore(msg.sender, difficulty, score);
        }
    }
    
    /**
     * @notice Get max score for a difficulty level
     * @param difficulty The difficulty string
     * @return Maximum allowed score
     */
    function _getMaxScore(string memory difficulty) internal pure returns (uint256) {
        bytes32 diffHash = keccak256(bytes(difficulty));
        if (diffHash == keccak256("EASY")) return MAX_SCORE_EASY;
        if (diffHash == keccak256("MEDIUM")) return MAX_SCORE_MEDIUM;
        if (diffHash == keccak256("HARD")) return MAX_SCORE_HARD;
        revert("Invalid difficulty");
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
     * @return Array of ScoreEntry structs, sorted highest to lowest
     */
    function getTopScores(string memory difficulty, uint256 count)
        external 
        view 
        returns (ScoreEntry[] memory) 
    {
        address[] memory allPlayers = players[difficulty];
        uint256 totalPlayers = allPlayers.length;
        
        if (totalPlayers == 0) {
            return new ScoreEntry[](0);
        }
        
        // Cap count to prevent gas issues
        if (count > 100) count = 100;
        
        // Create array with all players
        ScoreEntry[] memory allScores = new ScoreEntry[](totalPlayers);
        for (uint256 i = 0; i < totalPlayers; i++) {
            address player = allPlayers[i];
            allScores[i] = ScoreEntry({
                player: player,
                score: highScores[difficulty][player],
                timestamp: lastSubmissionTime[difficulty][player]
            });
        }
        
        // Optimized insertion sort (better for small-medium arrays)
        for (uint256 i = 1; i < totalPlayers; i++) {
            ScoreEntry memory key = allScores[i];
            uint256 j = i;
            while (j > 0 && allScores[j - 1].score < key.score) {
                allScores[j] = allScores[j - 1];
                j--;
            }
            allScores[j] = key;
        }
        
        // Return top N
        uint256 returnCount = count < totalPlayers ? count : totalPlayers;
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
     * @return rank The player's rank (1 = best, 0 = unranked/never played)
     */
    function getPlayerRank(address player, string memory difficulty)
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
        
        address[] memory allPlayers = players[difficulty];
        uint256 totalPlayers = allPlayers.length;
        
        rank = 1;
        for (uint256 i = 0; i < totalPlayers; i++) {
            address otherPlayer = allPlayers[i];
            if (otherPlayer != player && highScores[difficulty][otherPlayer] > playerScore) {
                rank++;
            }
        }
        
        return rank;
    }

    /**
     * @notice Get total number of players for a difficulty
     * @param difficulty The difficulty level
     * @return Total number of unique players who have submitted scores
     */
    function getTotalPlayers(string memory difficulty) 
        external 
        view 
        returns (uint256) 
    {
        return players[difficulty].length;
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
    
    /**
     * @notice Get all player stats in a single call (gas efficient for frontend)
     * @param player The player's address
     * @param difficulty The difficulty level
     * @return PlayerStats struct with all player data
     */
    function getPlayerStats(address player, string memory difficulty)
        external
        view
        returns (PlayerStats memory)
    {
        return PlayerStats({
            highScore: highScores[difficulty][player],
            rank: _getPlayerRankInternal(player, difficulty),
            totalPlayers: players[difficulty].length,
            lastSubmission: lastSubmissionTime[difficulty][player]
        });
    }
    
    /**
     * @notice Internal function to get player rank (reusable)
     */
    function _getPlayerRankInternal(address player, string memory difficulty)
        internal
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
        
        address[] memory allPlayers = players[difficulty];
        uint256 totalPlayers = allPlayers.length;
        
        rank = 1;
        for (uint256 i = 0; i < totalPlayers; i++) {
            address otherPlayer = allPlayers[i];
            if (otherPlayer != player && highScores[difficulty][otherPlayer] > playerScore) {
                rank++;
            }
        }
        
        return rank;
    }
}
