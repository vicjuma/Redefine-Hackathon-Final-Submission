import { useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../constants/constants";
import { useWallet } from "../providers/WalletProvider";

export const LightningStarknetComponent: React.FC = () => {
  const [bolt11, setBolt11] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const wallet = useWallet();
  if (!wallet) return null;
  const { walletSwapAccount } = wallet;

  const performTransaction = async () => {
    if (!bolt11 || !bolt11.startsWith("ln")) {
      toast.error("Enter a valid BOLT11 Lightning invoice");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Processing transaction...");

    try {
      const decodeResponse = await fetch(`${BASE_URL}/atomiq/decode-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: bolt11 }),
      });
      const decodeResult = await decodeResponse.json();
      if (!decodeResult.success) throw new Error("Failed to decode invoice");

      const backendResponse = await fetch(
        `${BASE_URL}/atomiq/starknet-to-lightning`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bolt11, walletSwapAccount }),
        },
      );
      const backendResult = await backendResponse.json();
      if (!backendResult.success)
        throw new Error(backendResult.message || "Transaction failed");

      toast.dismiss(toastId);
      toast.success("Transaction completed successfully!");
      setBolt11("");
    } catch (err: any) {
      console.error("Transaction error:", err);
      toast.dismiss(toastId);
      toast.error(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl text-white max-w-xl w-full">
      <h3 className="text-2xl font-bold mb-2">Starknet L2 → Bitcoin L1</h3>
      <p className="text-zinc-400 mb-6 text-sm">
        Send funds from Starknet L2 to a Lightning invoice.
      </p>

      <textarea
        value={bolt11}
        onChange={(e) => setBolt11(e.target.value.trim())}
        placeholder="Enter your BOLT11 Lightning invoice"
        rows={3}
        className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
      />

      <button
        onClick={performTransaction}
        disabled={loading}
        className="mt-5 w-full bg-yellow-500 hover:bg-yellow-400 transition text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <>
            <i className="fa-solid fa-spinner animate-spin"></i>
            Processing...
          </>
        ) : (
          <>
            <i className="fa-solid fa-coins"></i>
            Send to BTC
          </>
        )}
      </button>
    </div>
  );
};
