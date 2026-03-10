import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "./providers/WalletProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
      <App />
      <Toaster position="top-right" />
    </WalletProvider>
  </StrictMode>,
);
