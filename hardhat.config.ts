import { HardhatUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";
import "@parity/hardhat-polkadot";
import * as dotenv from "dotenv";

dotenv.config();

const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const accounts = ORACLE_PRIVATE_KEY ? [ORACLE_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 60000,
  },
  networks: {
    // Linea Sepolia (existing)
    lineaSepolia: {
      url: process.env.LINEA_RPC_URL || "https://rpc.sepolia.linea.build",
      accounts,
      chainId: 59141,
    },
    // Flow EVM Testnet
    flowTestnet: {
      url: "https://testnet.evm.nodes.onflow.org",
      accounts,
      chainId: 545,
    },
    // Polkadot Hub TestNet with EVM
    polkadotTestnet: {
      url: process.env.POLKADOT_RPC_URL || "https://rpc.polkadot.io/testnet",
      accounts,
      chainId: 420420417,
    },
    // Polkadot Hub MainNet with EVM
    polkadot: {
      url: process.env.POLKADOT_RPC_URL || "https://rpc.polkadot.io",
      accounts,
      chainId: 420420419,
    },
  },
};

export default config;
