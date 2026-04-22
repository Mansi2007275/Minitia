import { INITIA_MINIEVM_PARAMS } from "@/lib/keplr";

const explorerBase =
  INITIA_MINIEVM_PARAMS.blockExplorerUrls?.[0]?.replace(/\/$/, "") ||
  "https://scan.testnet.initia.xyz";

export function transactionExplorerUrl(hash: string | null | undefined): string | null {
  if (!hash || typeof hash !== "string") return null;
  const h = hash.trim();
  if (!h.startsWith("0x") || h.toLowerCase().includes("mock")) return null;
  return `${explorerBase}/tx/${h}`;
}
