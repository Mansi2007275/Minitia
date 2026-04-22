import { ethers } from 'ethers';

const looksLikeContractPlaceholder = (value) => {
  if (!value || typeof value !== 'string') return true;
  const v = value.trim().toLowerCase();
  return v.includes('your_deployed_contract') || v.includes('your_contract');
};

/** 32-byte hex private key (with or without 0x). Rejects .env placeholders like 0xyour_private_key_here. */
const isValidOraclePrivateKey = (raw) => {
  if (!raw?.trim()) return false;
  const s = raw.trim();
  if (/your_private_key|placeholder|example|dummy/i.test(s)) return false;
  const hex = s.startsWith('0x') ? s.slice(2) : s;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return false;
  try {
    new ethers.Wallet(`0x${hex}`);
    return true;
  } catch {
    return false;
  }
};

/** Returns a Wallet or null if key is missing, placeholder, or not valid hex. */
const getOracleWallet = (provider) => {
  const raw = process.env.ORACLE_PRIVATE_KEY;
  if (!isValidOraclePrivateKey(raw)) {
    if (raw?.trim()) {
      console.warn('ORACLE_PRIVATE_KEY missing or invalid. Using mock contract calls.');
    }
    return null;
  }
  const normalized = raw.trim().startsWith('0x') ? raw.trim() : `0x${raw.trim()}`;
  return new ethers.Wallet(normalized, provider);
};

const isValidTaskReward = (reward) => {
  const value = Number(reward);
  return Number.isFinite(value) && value > 0;
};

// Helper to get connected contract
const getContract = () => {
  const providerUrl = process.env.RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS?.trim();

  if (!providerUrl?.trim() || !contractAddress) {
    console.warn('Blockchain config missing. Using mock contract calls.');
    return null;
  }

  if (!ethers.isAddress(contractAddress) || looksLikeContractPlaceholder(contractAddress)) {
    console.warn('Invalid or placeholder CONTRACT_ADDRESS. Using mock contract calls.');
    return null;
  }

  const provider = new ethers.JsonRpcProvider(providerUrl.trim());
  const wallet = getOracleWallet(provider);
  if (!wallet) {
    console.warn('Oracle wallet not configured. Using mock contract calls.');
    return null;
  }
  
  // Minimal ABI for the MVP
  const abi = [
    "function createTask(uint taskId) payable",
    "function releasePayment(uint taskId, address contributor)"
  ];
  
  return new ethers.Contract(contractAddress, abi, wallet);
};

export const createTaskOnChain = async (onChainTaskId, reward) => {
  if (!isValidTaskReward(reward)) {
    console.warn(`Invalid reward passed to createTaskOnChain: ${reward}. Using mock contract calls.`);
    return `0xmock_create_tx_hash_${Date.now()}`;
  }

  const contract = getContract();
  
  if (!contract) {
    // Mock logic
    console.log(`[MOCK] Calling createTask on-chain for id: ${onChainTaskId} with reward: ${reward}`);
    return `0xmock_create_tx_hash_${Date.now()}`;
  }

  try {
    const tx = await contract.createTask(onChainTaskId, {
      value: ethers.parseEther(reward.toString())
    });
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Contract createTask error:", error);
    throw new Error("Failed to create task on-chain");
  }
};

export const releasePayment = async (onChainTaskId, contributorWallet) => {
  if (!ethers.isAddress(contributorWallet)) {
    console.warn(`Invalid contributor wallet passed to releasePayment: ${contributorWallet}. Using mock contract calls.`);
    return `0xmock_release_tx_hash_${Date.now()}`;
  }

  const contract = getContract();
  
  if (!contract) {
    // Mock logic
    console.log(`[MOCK] Calling releasePayment on-chain for id: ${onChainTaskId} to wallet: ${contributorWallet}`);
    return `0xmock_release_tx_hash_${Date.now()}`;
  }

  try {
    const tx = await contract.releasePayment(onChainTaskId, contributorWallet);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Contract releasePayment error:", error);
    throw new Error("Failed to release payment on-chain");
  }
};
