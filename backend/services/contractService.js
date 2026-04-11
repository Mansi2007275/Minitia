import { ethers } from 'ethers';

// Helper to get connected contract
const getContract = () => {
  const providerUrl = process.env.RPC_URL;
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!providerUrl || !privateKey || !contractAddress) {
    console.warn("Blockchain config missing. Using mock contract calls.");
    return null;
  }

  const provider = new ethers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Minimal ABI for the MVP
  const abi = [
    "function createTask(uint taskId) payable",
    "function releasePayment(uint taskId, address contributor)"
  ];
  
  return new ethers.Contract(contractAddress, abi, wallet);
};

export const createTaskOnChain = async (onChainTaskId, reward) => {
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
