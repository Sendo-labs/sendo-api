import axios from 'axios';
import { RateLimiter } from '../utils/rateLimiter.js';

// BirdEye API configuration
const BIRDEYE_API_BASE = 'https://public-api.birdeye.so/defi';
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || 'a96a597d5ed746a2a93cbb8f7d7602e6';
const BIRDEYE_RPS = parseInt(process.env.BIRDEYE_RATE_LIMIT || '1'); // requests per second

// Global rate limiter instance for BirdEye API
const birdEyeLimiter = new RateLimiter({ requestsPerSecond: BIRDEYE_RPS });

// BirdEye price data interface
export interface BirdEyePriceData {
  unixTime: number;
  value: number;
}

export interface BirdEyeResponse {
  success: boolean;
  data: {
    isScaledUiToken: boolean;
    items: BirdEyePriceData[];
  };
}

// All requests will go through birdEyeLimiter

/**
 * Fetch price history for a token between two timestamps.
 * Every HTTP call is scheduled through the shared rate limiter.
 */
export const getHistoricalPrices = async (
  mint: string,
  fromTimestamp: number,
  toTimestamp: number,
  timeframe: '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '8H' | '12H' | '1D' | '3D' | '1W' | '1M' = '30m'
): Promise<BirdEyePriceData[]> => {
  return birdEyeLimiter.schedule(async () => {
    try {
      const response = await axios.get<BirdEyeResponse>(`${BIRDEYE_API_BASE}/history_price`, {
        params: {
          address: mint,
          address_type: 'token',
          type: timeframe,
          time_from: fromTimestamp,
          time_to: toTimestamp,
          ui_amount_mode: 'raw'
        },
        headers: {
          'accept': 'application/json',
          'x-chain': 'solana',
          ...(BIRDEYE_API_KEY && { 'X-API-KEY': BIRDEYE_API_KEY })
        },
        timeout: 15000
      });
      // console.log('repsonse', response.data.data.items)

      if (response.data.success && response.data.data.items) {
        return response.data.data.items;
      }
      return [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.warn(`Rate limit hit for ${mint}, retrying in 1s...`);
        await new Promise((r) => setTimeout(r, 1000));
        return [];
      }
      console.error(`BirdEye error for ${mint}:`, axios.isAxiosError(error) ? `${error.response?.status} - ${error.message}` : (error instanceof Error ? error.message : String(error)));
      return [];
    }
  });
};

/**
 * Fetch full price history between two timestamps.
 * - Uses the rate limiter for every request
 * - Paginates to avoid duplicates (advance by last timestamp + 1)
 * - Deduplicates by unixTime
 */
export const getFullHistoricalPrices = async (
  mint: string,
  fromTimestamp: number,
  toTimestamp: number,
  timeframe: '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' = '1m'
): Promise<BirdEyePriceData[]> => {
  let allPrices: BirdEyePriceData[] = [];
  let currentStart = fromTimestamp;

  while (currentStart < toTimestamp) {
    const chunk = await getHistoricalPrices(mint, currentStart, toTimestamp, timeframe);

    if (!chunk.length) break;

    allPrices = [...allPrices, ...chunk];

    // Avancer au prochain timestamp (dernier timestamp récupéré + 1)
    const lastTimestamp = chunk[chunk.length - 1].unixTime;

    // Si BirdEye ne bouge plus → session terminée
    if (lastTimestamp <= currentStart) break;

    // Avancer au timestamp suivant pour éviter les doublons
    currentStart = lastTimestamp + 1;

    // Le rate limit est géré par birdEyeLimiter
  }

  // Deduplicate potential duplicates by unixTime
  return allPrices.filter((v, i, self) =>
    i === self.findIndex((t) => t.unixTime === v.unixTime)
  );
};

/**
 * Simple analysis from purchase to now and compute ATH.
 */
export const getPriceAnalysis = async (
  mint: string,
  purchaseTimestamp: number
) => {
  const now = Math.floor(Date.now() / 1000);
  
  const priceHistory = await getFullHistoricalPrices(mint, purchaseTimestamp, now, '30m');

  if (!priceHistory.length) return null;

  const purchasePrice = priceHistory[0].value;
  const currentPrice = priceHistory[priceHistory.length - 1].value;

  let athPrice = purchasePrice;
  let athTimestamp = purchaseTimestamp;

  for (const price of priceHistory) {
    if (price.value > athPrice) {
      athPrice = price.value;
      athTimestamp = price.unixTime;
    }
  }

  return { purchasePrice, currentPrice, athPrice, athTimestamp, priceHistory };
};
