import { useWallet } from "../providers/WalletProvider";

const HeaderComponent = () => {
  const wallet = useWallet();
  if (!wallet) return null;

  const { walletAccount, connectWallet, disconnectWallet } = wallet;

  return (
    <header className="w-full bg-gradient-to-r from-black via-zinc-900 to-black border-b border-zinc-800 sticky top-0 z-50">
      <div className="w-full px-5 py-5 flex items-center justify-between">
        {/* Left: Logo + Protocol Identity */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
            <i className="fa-brands fa-bitcoin text-black text-2xl"></i>
          </div>

          <div>
            <h1 className="text-white text-2xl font-bold tracking-wide">
              ZkStarkBit
            </h1>
            <p className="text-sm text-zinc-400">
              Lightning BTC → Wrapped BTC → Leveraged Yield Engine on Starknet
            </p>
          </div>
        </div>

        {/* Right: System Status */}
        <div className="flex items-center gap-6">
          {/* Network Status */}
          <div className="flex items-center gap-2 bg-zinc-800 px-5 py-2 rounded-2xl border border-zinc-700 text-sm text-zinc-300">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            Starknet Sepolia
          </div>

          {/* System Wallet Status */}
          <div className="flex items-center gap-2 bg-zinc-800 px-5 py-2 rounded-2xl border border-zinc-700 text-sm text-zinc-300">
            <i className="fa-solid fa-shield-halved text-yellow-400"></i>
            System Vault Active
          </div>

          {/* Hackathon Badge */}
          <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-400 px-5 py-2 rounded-2xl border border-yellow-500/30 text-sm">
            <i className="fa-solid fa-flask"></i>
            Hackathon Demo Mode
          </div>

          {/* Wallet Connect / Disconnect */}
          <div className="hidden md:flex">
            {walletAccount ? (
              <button
                onClick={disconnectWallet}
                className="
        px-5 py-2 rounded-2xl text-sm font-semibold
        bg-gradient-to-r from-orange-500 to-red-500
        text-white shadow-md
        hover:from-orange-600 hover:to-red-600
        hover:shadow-lg hover:scale-[1.02]
        transition-all duration-300
      "
              >
                Disconnect Wallet
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="
        px-5 py-2 rounded-2xl text-sm font-semibold
        bg-gradient-to-r from-yellow-400 to-yellow-600
        text-black shadow-md
        hover:from-yellow-500 hover:to-yellow-700
        hover:shadow-lg hover:scale-[1.02]
        transition-all duration-300
      "
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderComponent;
