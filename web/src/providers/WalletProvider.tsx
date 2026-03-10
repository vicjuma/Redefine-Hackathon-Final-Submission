import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { connect, disconnect } from "get-starknet";
import { WalletAccount } from "starknet";

type WalletContextType = {
  walletAccount: WalletAccount | null;
  walletSwapAccount: WalletAccount | null;
  walletName: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | null>(null);
const PROVIDER_URL = "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";
const ATOMIQ_PROVIDER_URL =
  "https://api.zan.top/public/starknet-sepolia/rpc/v0_9";
const WALLET_NAME_KEY = "connectedWalletName";

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAccount, setWalletAccount] = useState<WalletAccount | null>(
    null,
  );

  const [walletSwapAccount, setSwapWalletAccount] =
    useState<WalletAccount | null>(null);

  const [walletName, setWalletName] = useState("");

  const connectWallet = async () => {
    try {
      const selectedWallet = await connect({
        modalMode: "alwaysAsk",
        modalTheme: "light",
      });
      if (selectedWallet) {
        const myWalletAccount = await WalletAccount.connect(
          { nodeUrl: PROVIDER_URL },
          selectedWallet,
        );
        const swapWalletAccount = await WalletAccount.connect(
          { nodeUrl: ATOMIQ_PROVIDER_URL },
          selectedWallet,
        );

        setWalletAccount(myWalletAccount);
        setSwapWalletAccount(swapWalletAccount);
        setWalletName(selectedWallet.name || "Unknown Wallet");

        localStorage.setItem(WALLET_NAME_KEY, selectedWallet.name);
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
      setWalletAccount(null);
      setWalletName("");
      localStorage.removeItem(WALLET_NAME_KEY);
      console.log("Wallet disconnected");
    } catch (error) {
      console.error("Wallet disconnection failed:", error);
    }
  };

  // Reconnect on refresh
  useEffect(() => {
    const reconnectWallet = async () => {
      const storedWalletName = localStorage.getItem(WALLET_NAME_KEY);
      if (!storedWalletName) return;

      const selectedWallet = await connect({
        modalMode: "neverAsk",
        modalTheme: "light",
      });

      if (selectedWallet && selectedWallet.name === storedWalletName) {
        const myWalletAccount = await WalletAccount.connect(
          { nodeUrl: PROVIDER_URL },
          selectedWallet,
        );

        const swapWalletAccount = await WalletAccount.connect(
          { nodeUrl: ATOMIQ_PROVIDER_URL },
          selectedWallet,
        );

        setWalletAccount(myWalletAccount);
        setSwapWalletAccount(swapWalletAccount);
        setWalletName(selectedWallet.name);
      }
    };

    reconnectWallet();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletAccount,
        walletSwapAccount,
        walletName,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  return useContext(WalletContext);
};
