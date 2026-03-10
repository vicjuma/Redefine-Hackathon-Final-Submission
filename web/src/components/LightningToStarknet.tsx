import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../constants/constants";
import { QRCodeCanvas } from "qrcode.react";
import { useWallet } from "../providers/WalletProvider";

interface LightningToStarknetProps {
  onSwapComplete?: () => void;
}

const LightningToStarknet = ({ onSwapComplete }: LightningToStarknetProps) => {
  const [satsAmount, setSatsAmount] = useState<number>(0);
  const [swapInvoice, setSwapInvoice] = useState<string | null>(null);
  const [swapId, setSwapId] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<string | null>(null);
  const [loadingSwap, setLoadingSwap] = useState<boolean>(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wallet = useWallet();
  if (!wallet) return null;

  const { walletSwapAccount } = wallet;

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/atomiq/${id}/status`);
        if (!res.ok) throw new Error("Failed to fetch swap status");
        const data = await res.json();
        setSwapStatus(data.status);
        if (data.status === "PAID") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setSwapInvoice(null);
          setSwapId(null);
          toast.success("Swap completed successfully!", { duration: 20000 });
          if (onSwapComplete) onSwapComplete();
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  const performSwap = async () => {
    if (!satsAmount || satsAmount <= 0)
      return toast.error("Please enter a valid sats amount");
    setLoadingSwap(true);
    setSwapStatus(null);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`${BASE_URL}/atomiq/lightning-to-starknet`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sats: satsAmount, walletSwapAccount }),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSwapInvoice(data.invoice);
      setSwapId(data.swapId);
      setSwapStatus("WAITING_FOR_PAYMENT");
      setSatsAmount(0);
      toast.success("Invoice generated! Please complete payment ⚡");
      startPolling(data.swapId);
    } catch (err) {
      console.error("Swap failed:", err);
      toast.error("Swap failed. Please try again.");
    } finally {
      setLoadingSwap(false);
    }
  };

  const handleSwapClick = () => {
    if (!satsAmount || satsAmount <= 0)
      return toast.error("Please enter a valid sats amount");
    performSwap();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl text-white max-w-xl w-full">
      <h3 className="text-2xl font-bold mb-2">Lightning BTC → Starknet wBTC</h3>
      <p className="text-zinc-400 mb-6 text-sm">
        Wrap your Lightning BTC into Starknet and mint wBTC directly into the
        vault.
      </p>
      <input
        type="number"
        value={satsAmount}
        onChange={(e) => setSatsAmount(Number(e.target.value))}
        placeholder="Enter sats amount"
        className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
      />
      <button
        onClick={handleSwapClick}
        disabled={loadingSwap}
        className="mt-5 w-full bg-yellow-500 hover:bg-yellow-400 transition text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"
      >
        {loadingSwap ? (
          <>
            <i className="fa-solid fa-spinner animate-spin"></i>
            Processing...
          </>
        ) : (
          <>
            <i className="fa-solid fa-bolt"></i>
            Generate Lightning Invoice
          </>
        )}
      </button>
      {swapInvoice && (
        <div className="mt-8 bg-black border border-zinc-800 rounded-xl p-6">
          <div className="mb-4 text-center">
            <p className="text-lg font-semibold text-yellow-400">
              ⚡ Complete Payment
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Scan the QR or copy the invoice below.
            </p>
          </div>
          <p className="text-xs text-zinc-500 break-all mb-2">
            Swap ID: {swapId}
          </p>
          <p className="text-sm break-all text-white bg-zinc-900 p-3 rounded-lg border border-zinc-800">
            {swapInvoice}
          </p>
          <div className="flex justify-center mt-6">
            <QRCodeCanvas
              value={swapInvoice}
              size={150}
              bgColor="#000000"
              fgColor="#FFFFFF"
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="mt-6 text-center text-sm">
            Status:{" "}
            <span className="text-orange-400 font-semibold">{swapStatus}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LightningToStarknet;
