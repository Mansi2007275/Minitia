"use client";

import { useEffect, useState } from "react";
import { connectKeplrEvm, getKeplrEvmProvider } from "@/lib/keplr";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function KeplrConnect() {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const provider = getKeplrEvmProvider();
    if (!provider) return;

    const onAccountsChanged = (accs: unknown) => {
      const list = accs as string[];
      setAccount(list[0] ?? null);
    };

    provider.on("accountsChanged", onAccountsChanged);
    return () => {
      provider.removeListener("accountsChanged", onAccountsChanged);
    };
  }, [mounted]);

  const connect = async () => {
    setError(null);
    try {
      const nextAccount = await connectKeplrEvm();
      setAccount(nextAccount);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request rejected";
      setError(message);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setError(null);
  };

  if (!mounted) {
    return <div className="wallet-connect-slot" aria-hidden />;
  }

  if (!getKeplrEvmProvider()) {
    return (
      <a
        href="https://www.keplr.app/download"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary btn-nav-wallet"
      >
        Install Keplr
      </a>
    );
  }

  if (account) {
    return (
      <div className="wallet-connect-row">
        <span className="wallet-address" title={account}>
          {shortenAddress(account)}
        </span>
        <button type="button" className="btn btn-secondary btn-nav-wallet" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect-row">
      <button type="button" className="btn btn-nav-wallet" onClick={() => void connect()}>
        Connect Keplr
      </button>
      {error ? <span className="wallet-error">{error}</span> : null}
    </div>
  );
}
