/** Initia registry `evm-1` MiniEVM testnet (eth_chainId from public JSON-RPC). */
export const INITIA_MINIEVM_CHAIN_ID = 31337;
export const INITIA_MINIEVM_CHAIN_HEX = "0x7a69";
export const INITIA_MINIEVM_JSONRPC = "http://127.0.0.1:8545";

export const REQUIRED_INIT_ADDRESS = "init135eaeut4e8yyaf79y20zhj0h792fcjcmkmhzcs";
export const REQUIRED_EVM_ADDRESS = "0x8d33Dcf175c9C84Ea7c5229e2BC9F7F1549C4B1b";

export const INITIA_MINIEVM_PARAMS = {
  chainId: INITIA_MINIEVM_CHAIN_HEX,
  chainName: "Initia MiniEVM (evm-1 testnet)",
  nativeCurrency: {
    name: "INIT",
    symbol: "INIT",
    decimals: 18,
  },
  rpcUrls: [INITIA_MINIEVM_JSONRPC],
  blockExplorerUrls: ["https://scan.testnet.initia.xyz/evm-1"],
};

type EvmProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
};

export function getKeplrEvmProvider(): EvmProvider | null {
  if (typeof window === "undefined") return null;
  if (!window.keplr) return null;
  return window.keplr.ethereum ?? null;
}

async function ensureInitiaEvmChain(provider: EvmProvider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: INITIA_MINIEVM_CHAIN_HEX }],
    });
  } catch (err) {
    const error = err as { code?: number };
    if (error?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [INITIA_MINIEVM_PARAMS],
      });
      return;
    }
    throw err;
  }
}

async function assertRpcHealthy(provider: EvmProvider) {
  try {
    await provider.request({ method: "eth_blockNumber" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown RPC error";
    throw new Error(
      `Initia MiniEVM RPC is unreachable (${INITIA_MINIEVM_JSONRPC}). ` +
        `If you are offline or DNS-blocked, try another network or set a mirror in Keplr. Details: ${message}`
    );
  }
}

export async function connectKeplrEvm(): Promise<string> {
  const provider = getKeplrEvmProvider();
  if (!provider) {
    throw new Error("Keplr is not available or EVM support is disabled");
  }
  await ensureInitiaEvmChain(provider);
  await assertRpcHealthy(provider);
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  const account = accounts[0];
  if (!account) {
    throw new Error("No account found in Keplr");
  }
  return account;
}

export async function getKeplrEvmAccounts(): Promise<string[]> {
  const provider = getKeplrEvmProvider();
  if (!provider) return [];
  await ensureInitiaEvmChain(provider);
  await assertRpcHealthy(provider);
  return (await provider.request({ method: "eth_accounts" })) as string[];
}
