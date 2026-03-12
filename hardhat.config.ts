import { HardhatUserConfig } from "hardhat/types";
import "@parity/hardhat-polkadot";

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
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 59141,
    },
    // Polkadot Hub TestNet with EVM
    polkadotTestnet: {
      url: process.env.POLKADOT_RPC_URL || "https://rpc.polkadot.io/testnet",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420417,
      polkadot: {
        evmChainId: 420420417,
      },
    },
    // Polkadot Hub MainNet with EVM
    polkadot: {
      url: process.env.POLKADOT_RPC_URL || "https://rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420419,
      polkadot: {
        evmChainId: 420420419,
      },
    },
  },
};

export default config;
