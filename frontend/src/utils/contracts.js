// frontend/src/utils/contracts.js
// ─────────────────────────────────────────────────────────────
//  Shared utility — ALL members import from here
//  After deploying, addresses.json is auto-filled by deploy.js
// ─────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import addresses from "./addresses.json";

// ABIs — copy from artifacts/ after running: npx hardhat compile
import CrowdfundingABI from "./abi/Crowdfunding.json";
import RewardTokenABI from "./abi/RewardToken.json";
import UserRegistryABI from "./abi/UserRegistry.json";

// ── Get provider & signer from MetaMask ──────────────────────
export async function getProviderAndSigner() {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
}

// ── Get connected wallet address ─────────────────────────────
export async function getWalletAddress() {
  const { signer } = await getProviderAndSigner();
  return await signer.getAddress();
}

// ── Contract instances (read + write) ────────────────────────
export async function getCrowdfundingContract() {
  const { signer } = await getProviderAndSigner();
  return new ethers.Contract(addresses.Crowdfunding, CrowdfundingABI.abi, signer);
}

export async function getRewardTokenContract() {
  const { signer } = await getProviderAndSigner();
  return new ethers.Contract(addresses.RewardToken, RewardTokenABI.abi, signer);
}

export async function getUserRegistryContract() {
  const { signer } = await getProviderAndSigner();
  return new ethers.Contract(addresses.UserRegistry, UserRegistryABI.abi, signer);
}

// ── Helpers ──────────────────────────────────────────────────
export function toWei(eth) {
  return ethers.parseEther(eth.toString());
}

export function fromWei(wei) {
  return ethers.formatEther(wei);
}

export function toUnixTimestamp(dateString) {
  return Math.floor(new Date(dateString).getTime() / 1000);
}

export function fromUnixTimestamp(ts) {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function isDeadlinePassed(deadline) {
  return Date.now() / 1000 > Number(deadline);
}
