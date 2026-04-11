# Intia - AI-Verified Decentralized Task Marketplace

This is a complete MVP for a decentralized task marketplace where creators post tasks, contributors submit work, an AI evaluator judges the submission, and a smart contract oracle releases payment if the AI approves.

## Requirements
- Node.js v18+
- OpenAI API Key

## Setup & Run

### 1. Smart Contract (Optional / Testnet)
The `contracts/TaskMarketplace.sol` contains the logic.
Deploy it using Remix or Hardhat to Sepolia/Goerli.
Keep the Contract Address, ABI, your Wallet Private Key, and an RPC URL handy.

### 2. Backend Setup
1. `cd backend`
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your keys:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   # Optional real smart contract info, otherwise mocks are used
   RPC_URL=https://sepolia.infura...
   ORACLE_PRIVATE_KEY=...
   CONTRACT_ADDRESS=...
   ```
4. Start the backend: `npm run dev` (runs on http://localhost:5000)

### 3. Frontend Setup
1. `cd frontend`
2. Run `npm install`
3. Make sure `.env.local` contains `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
4. Start the frontend: `npm run dev` (runs on http://localhost:3000)

## Demo Flow
1. Open http://localhost:3000
2. Click **Create Task**. Type "Write a python script that prints hello" and click "Generate Task Structure". Then click "Confirm & Create".
3. Back on the dashboard, you will see the task with status "open". Click **Submit Work**.
4. Enter your submission details and submit.
5. Back on the dashboard, the task is now "submitted". Click **Evaluate**.
6. Click **Run AI Evaluation**. The AI will verify the submission based on criteria. If it passes, a transaction is (mock) sent to the contract to release funds!
