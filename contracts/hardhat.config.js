require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

function deployerAccounts() {
  const raw = (process.env.INITIA_DEPLOYER_PRIVATE_KEY || "").trim();
  if (!raw) return [];
  const pk = raw.startsWith("0x") ? raw : `0x${raw}`;
  return [pk];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    /** Initia registry `evm-1` MiniEVM — same JSON-RPC as frontend/lib/keplr.ts */
    initia: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: deployerAccounts(),
    },
  },
};
