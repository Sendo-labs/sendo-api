import { Request, Response } from 'express';
import { getTransactionsForAddress, getNftsForAddress, getTokensForAddress, getBalanceForAddress } from '../services/helius.js';
import { serializedBigInt } from '../utils/decoder/index.js';
import { parseTransactionsWithPriceAnalysis, calculateGlobalSummary } from '../utils/parseTrade.js';

export const getTradesForAddressController = async (req: Request, res: Response) => {
    try {
        const address: string = req.params.address;
        const limit: number = Number(req.query.limit) || 30;
        const cursor: string | undefined = req.query.cursor as string;

        if (!address) {
            return res.status(400).json({
                message: 'Address is required',
                version: '1.0.0'
            });
        }

        // Fetch transactions from Helius
        const result = await getTransactionsForAddress(address, limit, cursor);
        const { transactions, signatures, hasMore } = result;

        // Fetch additional address data in parallel
        const [nfts, tokens, balance] = await Promise.all([
            getNftsForAddress(address),
            getTokensForAddress(address),
            getBalanceForAddress(address)
        ]);

        // Parse transactions and analyze prices
        const parsedTransactionsArray = await parseTransactionsWithPriceAnalysis(transactions);

        // Calculate global summary
        const globalSummary = calculateGlobalSummary(parsedTransactionsArray);

        // Build pagination info
        const pagination = {
            limit: limit,
            hasMore: hasMore,
            nextCursor: signatures.length > 0 ? signatures[signatures.length - 1] : null,
            currentCursor: cursor || null,
            totalLoaded: transactions.length
        };

        // Return response
        res.json({
            message: 'Transactions retrieved successfully',
            version: '1.0.0',
            summary: globalSummary,
            pagination: pagination,
            global: {
                signatureCount: signatures.length,
                balance: serializedBigInt(balance),
                nfts: nfts,
                tokens: tokens,
            },
            trades: serializedBigInt(parsedTransactionsArray),
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error retrieving transactions',
            version: '1.0.0',
            error: error
        });
    }
};