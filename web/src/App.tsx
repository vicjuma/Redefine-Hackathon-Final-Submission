import DepositWBTC from "./components/DepositWBTC.tsx";
import HeaderComponent from "./components/HeaderComponent.tsx";
import { LightningStarknetComponent } from "./components/LightningStarknetComponent.tsx";
import LightningToStarknet from "./components/LightningToStarknet.tsx";
import WithdrawWBTC from "./components/WithdrawWBTC.tsx";
import YieldDashboard from "./components/YieldDashboard.tsx";

function App() {
  return (
    <div className="bg-black text-white min-h-screen">
      <HeaderComponent />
      <main className="max-w-5xl mx-auto p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <LightningToStarknet />
          <DepositWBTC />
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          <WithdrawWBTC />
          <YieldDashboard />
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          <LightningStarknetComponent />
        </div>
      </main>
    </div>
  );
}

export default App;
