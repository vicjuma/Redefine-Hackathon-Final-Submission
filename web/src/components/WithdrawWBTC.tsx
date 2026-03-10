import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../constants/constants";
import { useWallet } from "../providers/WalletProvider";

interface Commitment {
  id: number;
  commitment: string;
  deposit_amount: number;
  yield_amount: number;
  timestamp: string;
  proof_validated: boolean;
  notes?: string | null;
}

function WithdrawWBTC() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [selectedCommitment, setSelectedCommitment] =
    useState<Commitment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [proofResponse, setProofResponse] = useState<any>(null);

  const wallet = useWallet();
  if (!wallet) return null;

  const { walletSwapAccount } = wallet;

  const fetchCommitments = () => {
    if (!walletSwapAccount) return;

    setLoading(true);

    fetch(`${BASE_URL}/atomiq/commitments/${walletSwapAccount.address}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCommitments(data.data);
        } else {
          toast.error("Failed to fetch commitments");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error fetching commitments");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!walletSwapAccount) return;

    // initial fetch
    fetchCommitments();

    // poll every 5 seconds
    const interval = setInterval(() => {
      fetchCommitments();
    }, 5000);

    return () => clearInterval(interval);
  }, [walletSwapAccount]);

  const generateWithdrawalProof = async () => {
    if (!selectedCommitment) return toast.error("Please select a commitment");

    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/atomiq/generate-withdrawal-proof`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: selectedCommitment.deposit_amount,
            commitment: selectedCommitment.commitment,
            walletSwapAccount,
          }),
        },
      );

      const data = await response.json();
      setProofResponse(data.data);
      toast.success("Withdrawal proof generated successfully");
      setSelectedCommitment(null);
    } catch (error) {
      toast.error("Failed to generate withdrawal proof");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl text-white max-w-xl w-full">
      <h3 className="text-2xl font-bold mb-2">Withdraw wBTC</h3>
      <p className="text-zinc-400 mb-6 text-sm">
        Generate a zero-knowledge proof for your withdrawal. Receive WBTC
        securely.
      </p>

      <input
        type="number"
        value={selectedCommitment?.deposit_amount || 0}
        disabled
        placeholder="Amount will be auto-filled"
        className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4"
      />

      <div className="mb-4">
        <span className="text-zinc-400 mb-2 block">Select Commitment:</span>
        {loading && <div>Loading commitments...</div>}
        {!loading && commitments.length === 0 && (
          <div className="text-zinc-500">No commitments found.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commitments.map((c) => {
            const isSelected = selectedCommitment?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCommitment(c)}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "border-yellow-500 bg-yellow-900/30 shadow-lg"
                    : "border-zinc-700 hover:border-yellow-400 hover:bg-zinc-800"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">Commitment</span>
                  {isSelected && (
                    <span className="text-yellow-400 text-xs">Selected</span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 break-all mb-1">
                  {c.commitment}
                </div>
                <div className="flex justify-between text-xs">
                  <span>Deposit: {c.deposit_amount}</span>
                  <span>Yield: {c.yield_amount}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {new Date(c.timestamp).toLocaleString()}
                </div>
                {c.notes && (
                  <div className="text-xs text-zinc-400 mt-1">
                    Notes: {c.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={generateWithdrawalProof}
        disabled={loading}
        className="mt-5 w-full bg-yellow-500 hover:bg-yellow-400 transition text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <>
            <i className="fa-solid fa-spinner animate-spin"></i>
            Generating...
          </>
        ) : (
          <>
            <i className="fa-solid fa-shield-halved"></i>
            Generate & Withdraw
          </>
        )}
      </button>

      {proofResponse && (
        <div className="mt-6 bg-black border border-zinc-800 rounded-xl p-4 text-sm break-all">
          <div>Type: withdrawal</div>
          <div>Commitment: {proofResponse.commitment}</div>
          <div>Secret: {proofResponse.secret}</div>
          <div>Amount: {proofResponse.amount}</div>

          <div className="mt-2">Calldata (preview, first 20 elements):</div>

          <pre className="text-xs whitespace-pre-wrap break-all bg-zinc-950 p-3 rounded-lg mt-1">
            {proofResponse.calldata?.slice(0, 20).join(", ")}
          </pre>
        </div>
      )}
    </div>
  );
}

export default WithdrawWBTC;
