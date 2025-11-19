import { ethers } from 'ethers';
import { HouseOfCardsABI } from '@/abi/HouseOfCardsABI';

// This would be an environment variable in production
// For now, we can use a dummy private key or the user's key if they provide it
// NEVER COMMIT REAL PRIVATE KEYS
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default #0
const CONTRACT_ADDRESS = '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90';
const RPC_URL = 'https://rpc.sepolia.linea.build';

export async function getOracleContract() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);

    // We need to cast the ABI to any because of some type mismatches between viem and ethers
    return new ethers.Contract(CONTRACT_ADDRESS, HouseOfCardsABI as any, wallet);
}
