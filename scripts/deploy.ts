const { ethers, run } = require("hardhat");

async function main() {
  const network = (await ethers.provider.getNetwork()).chainId;
  console.log(`Deploying to network: ${network}`);

  // Deploy Leaderboard first (no constructor args)
  console.log("Deploying Leaderboard...");
  const Leaderboard = await ethers.getContractFactory("Leaderboard");
  const leaderboard = await Leaderboard.deploy();
  await leaderboard.waitForDeployment();
  const leaderboardAddress = await leaderboard.getAddress();
  console.log(`Leaderboard deployed to: ${leaderboardAddress}`);

  // Deploy HouseOfCards (no constructor args)
  console.log("Deploying HouseOfCards...");
  const HouseOfCards = await ethers.getContractFactory("HouseOfCards");
  const houseOfCards = await HouseOfCards.deploy();
  await houseOfCards.waitForDeployment();
  const houseOfCardsAddress = await houseOfCards.getAddress();
  console.log(`HouseOfCards deployed to: ${houseOfCardsAddress}`);

  // Verify contracts (if block explorer API is available)
  if (process.env.ETHERSCAN_API_KEY || process.env.POLKADOTSCAN_API_KEY) {
    try {
      console.log("Verifying contracts...");
      await run("verify:verify", {
        address: leaderboardAddress,
        constructorArguments: [],
      });
      await run("verify:verify", {
        address: houseOfCardsAddress,
        constructorArguments: [],
      });
      console.log("Contracts verified!");
    } catch (e) {
      console.log("Verification failed (expected if no API key):", e);
    }
  }

  // Save deployment addresses
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Network Chain ID: ${network}`);
  console.log(`Leaderboard: ${leaderboardAddress}`);
  console.log(`HouseOfCards: ${houseOfCardsAddress}`);
  console.log("\nUpdate your .env with:");
  console.log(`POLKADOT_CONTRACT_ADDRESS=${houseOfCardsAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
