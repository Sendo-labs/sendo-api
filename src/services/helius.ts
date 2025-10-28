import { decodeTxData } from '../utils/decoder/index.js';
import { helius } from '../config/index.js';
import { serializedBigInt } from '@/utils/decoder/index.js';
import { RateLimiter } from '../utils/rateLimiter.js';

// Helius API configuration
const HELIUS_RPS = parseInt(process.env.HELIUS_RATE_LIMIT || '50'); // requests per second

// Global rate limiter instance for Helius API
const heliusLimiter = new RateLimiter({ 
  requestsPerSecond: HELIUS_RPS,
  burstCapacity: 100,
  adaptiveTiming: true
});

// Helper function to use rate limiting avec optimisations
const withRateLimit = async <T>(fn: () => Promise<T>): Promise<T> => {
    return heliusLimiter.schedule(fn);
};

export const getAccountInfo = async (address: string) => {
    return withRateLimit(async () => {
        const account = await helius.getAccountInfo(address, {
            "encoding": "base64"
        });
        return account;
    });
};

export const getBlock = async (address: string) => {
    return withRateLimit(async () => {
        const account = await helius.getBlock(address);
        return account;
    });
};

export const getSignaturesForAddress = async (address: string, limit: number) => {
    return withRateLimit(async () => {
        const signatures = await helius.getSignaturesForAddress(
            address,
            { limit }
        );
        return signatures;
    });
};

export const getNftsForAddress = async (address: string) => {
    return withRateLimit(async () => {
        const nfts = await helius.getAssetsByOwner({ ownerAddress: address });
        return nfts;
    });
};

export const getTokensForAddress = async (address: string) => {
    return withRateLimit(async () => {
        const tokens = await helius.getTokenAccounts({ owner: address });
        return tokens;
    });
};

export const getBalanceForAddress = async (address: string) => {
    return withRateLimit(async () => {
        const balance = await helius.getBalance(address);
        return balance;
    });
};

export const getTransactionsForAddress = async (address: string, limit: number, before?: string) => {
    const config: any = { limit };

    if (before) {
        config.before = before;
    }
    
    // Récupérer les signatures (1 seul appel rate limité)
    const signatures = await withRateLimit(async () => {
        return await helius.getSignaturesForAddress(address, config);
    });
    
    // Mapper chaque signature en promise rate limitée
    // Chaque appel à getTransactionBySignature a son propre rate limit
    const transactionPromises = signatures.map(signatureObj => 
        getTransactionBySignature(signatureObj.signature)
    );

    // Exécuter TOUTES les transactions en parallèle
    // Le rate limiter contrôle automatiquement le flux
    const transactionResults = await Promise.all(transactionPromises);
    
    // Filtrer les null/undefined
    const transactions = transactionResults.filter(tx => tx !== null);
    
    return {
        transactions,
        signatures: signatures.map(s => s.signature),
        hasMore: signatures.length === limit
    };
};

export const getTransactionBySignature = async (signature: string) => {
    return withRateLimit(async () => {
        const transaction = await helius.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
        });
        return transaction;
    });
};

