export const HOUSE_OF_CARDS_ABI = [
    // Events
    "event GameCreated(uint256 indexed gameId)",
    "event PlayerJoined(uint256 indexed gameId, address player)",
    "event GameStarted(uint256 indexed gameId)",
    "event TurnChanged(uint256 indexed gameId, address player, uint256 deadline)",
    "event PlayerEliminated(uint256 indexed gameId, address player, string reason)",
    "event PlayerReloaded(uint256 indexed gameId, address player)",
    "event GameCollapsed(uint256 indexed gameId)",
    "event GameEnded(uint256 indexed gameId, address winner, uint256 amount)",
    "event PotSplit(uint256 indexed gameId, uint256 amountPerPlayer)",

    // Read Functions
    "function currentGameId() view returns (uint256)",
    "function games(uint256) view returns (uint256 id, uint8 state, uint256 pot, uint256 turnDuration, uint256 startTime, uint256 lastMoveTime, address currentPlayer, uint256 currentTurnIndex, uint256 collapseThreshold)",
    "function MAX_PLAYERS() view returns (uint256)",

    // Write Functions (User)
    "function joinGame() payable",
    "function reload() payable",

    // Write Functions (Oracle/Owner)
    "function completeTurn(uint256 gameId)",
    "function timeoutTurn(uint256 gameId)",
    "function reportCollapse(uint256 gameId)"
];
