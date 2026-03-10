import { ZK_STARKBIT_ABI } from "./abis";
import { Contract, RpcProvider } from "starknet";

export const MY_CONTRACT_ADDRESS =
  "0x02e5f0821522bf53b59bbc326b97ad41c672994e222467330e9cd339478e4a5c";

export const BASE_URL = "http://localhost:3000";

export const NetworkName = {
  MAINNET: "Ethereum Mainnet",
  GOERLI: "Goerli Testnet",
  SEPOLIA: "Sepolia Testnet",
  SN_MAINNET: "StarkNet Mainnet",
  SN_SEPOLIA: "https://api.zan.top/public/starknet-sepolia/rpc/v0_9",
};

export const provider = new RpcProvider({
  nodeUrl: NetworkName.SN_SEPOLIA,
});

export const contract = new Contract({
  abi: ZK_STARKBIT_ABI,
  address: MY_CONTRACT_ADDRESS,
  providerOrAccount: provider,
});
