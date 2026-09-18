import { ApiClient } from "./client";
import { AuthApi } from "./auth";
import { MarketDataApi } from "./market-data";
import { TradingApi } from "./trading";
import { getAccessToken } from "../auth/auth-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken,
});

export const authApi = new AuthApi(apiClient);
export const marketDataApi = new MarketDataApi(apiClient);
export const tradingApi = new TradingApi(apiClient);
