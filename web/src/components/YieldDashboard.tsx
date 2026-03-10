import { useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../constants/constants";
import { useWallet } from "../providers/WalletProvider";

function YieldDashboard() {
  const [totalYield, setTotalYield] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);

  const wallet = useWallet();
  if (!wallet) return null;

  const { walletSwapAccount } = wallet;

  const fetchYield = async () => {
    if (!walletSwapAccount) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/atomiq/total-yields/${walletSwapAccount.address}`,
      );
      const data = await res.json();
      if (data.success) {
        setTotalYield(Number(data.data.totalYield || 0));
      } else {
        toast.error("Failed to fetch yield data");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching yield data");
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    if (!walletSwapAccount) return;
    if (totalYield === 0) return toast("No rewards to claim");
    setClaiming(true);
    try {
      const res = await fetch(`${BASE_URL}/atomiq/claim-rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletSwapAccount }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success(result.message);
        fetchYield();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error claiming rewards");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl text-white max-w-xl w-full">
      <h3 className="text-2xl font-bold mb-2">Yield Dashboard</h3>
      <p className="text-zinc-400 mb-6 text-sm">
        View your total yield and claim pending rewards from your deposits.
      </p>

      <div className="mb-4">
        <div className="text-zinc-400 mb-2">Total Yield:</div>
        <div className="text-white font-semibold text-lg mb-4">
          {loading ? "Loading..." : totalYield} STRK
        </div>

        <button
          onClick={fetchYield}
          disabled={loading}
          className="w-full bg-zinc-700 hover:bg-zinc-600 transition text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg mb-3"
        >
          {loading ? (
            <>
              <i className="fa-solid fa-spinner animate-spin"></i>
              Fetching...
            </>
          ) : (
            <>
              <i className="fa-solid fa-arrows-rotate"></i>
              Fetch Yield
            </>
          )}
        </button>

        <button
          onClick={claimRewards}
          disabled={claiming || totalYield === 0}
          className="w-full bg-yellow-500 hover:bg-yellow-400 transition text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          {claiming ? (
            <>
              <i className="fa-solid fa-spinner animate-spin"></i>
              Claiming...
            </>
          ) : (
            <>
              <i className="fa-solid fa-coins"></i>
              Claim Rewards
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default YieldDashboard;
