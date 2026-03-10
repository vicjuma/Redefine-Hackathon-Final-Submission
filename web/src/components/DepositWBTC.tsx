import { useState } from "react";
import toast from "react-hot-toast";
import {
  BASE_URL,
  MY_CONTRACT_ADDRESS,
  provider,
} from "../constants/constants";
import { useWallet } from "../providers/WalletProvider";
import { Account, Contract } from "starknet";
import { ZK_STARKBIT_ABI } from "../constants/abis";

function DepositWBTC() {
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [proofResponse, setProofResponse] = useState<any>(null);

  const wallet = useWallet();
  if (!wallet) return null;

  const myAccount = new Account({
    provider: provider,
    address:
      "0x02f02356893365D8fC0F91663A0DaE38a3f2690B616026BC52D1D4c126E008E7",
    signer:
      "0x07b81c2c18f4c2486e583c3b1ef05222f7d9a2a01e5fa815aeb2009004c94419",
  });

  const contract = new Contract({
    abi: ZK_STARKBIT_ABI,
    address: MY_CONTRACT_ADDRESS,
    providerOrAccount: myAccount,
  });

  const generateProof = async () => {
    if (!amount || amount <= 0)
      return toast.error("Please enter a valid amount");

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/atomiq/generate-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, contract }),
      });

      const data = await response.json();
      console.log(data);

      setProofResponse({
        ...data,
        calldata_preview: data.calldata?.slice(0, 20),
      });

      toast.success("Proof generated successfully");
      setAmount(0);
    } catch (error) {
      toast.error("Failed to generate proof");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl text-white max-w-xl w-full">
      <h3 className="text-2xl font-bold mb-2">Deposit wBTC</h3>
      <p className="text-zinc-400 mb-6 text-sm">
        Generate a zero-knowledge proof for your deposit. Gain high yield in
        seconds
      </p>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="Enter amount"
        className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
      />

      <button
        onClick={generateProof}
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
            Generate Proof
          </>
        )}
      </button>

      {proofResponse && (
        <div className="mt-6 bg-black border border-zinc-800 rounded-xl p-4 text-sm break-all">
          <div>Type: {proofResponse.type || "deposit"}</div>
          <div>Commitment: {proofResponse.commitment}</div>
          <div>Secret: {proofResponse.secret}</div>
          <div>Amount: {proofResponse.amount}</div>

          <div className="mt-2">Calldata (preview, first 20 elements):</div>

          <pre className="text-xs whitespace-pre-wrap break-all">
            {proofResponse.calldata_preview?.join(", ")}
          </pre>
        </div>
      )}
    </div>
  );
}

export default DepositWBTC;
