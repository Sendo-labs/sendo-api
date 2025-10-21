import { Request, Response } from 'express';
import { getTransactionsForAddress } from '../services/helius.js';
import { decodeTxData } from '../utils/decoder/index.js';
import { serializedBigInt } from '../utils/decoder/index.js';
import { getPriceAnalysis } from '../services/birdeyes.js';
import { getSignerTrades } from '../utils/decoder/extractBalances.js';

export const getTradesForAddressController = async (req: Request, res: Response) => {
    try {
        const address: string = req.params.address;
        const limit: number = Number(req.query.limit) || 5;

        if (!address) {
            return res.status(400).json({
                message: 'Address is required',
                version: '1.0.0'
            });
        }

        const transactions = await getTransactionsForAddress(address, limit);
        const parsedTransactionsArray: any[] = [];

        for (const transaction of transactions) {
            const tx = await decodeTxData(transaction);

            if (tx.error === 'SUCCESS') {
                // Utiliser la nouvelle fonction pour détecter tous les trades du signer
                const signerTrades = getSignerTrades(tx.balances);
                
                if (signerTrades.length > 0) {                    
                    // Analyze price for each token trade
                    const trades: any[] = [];
                    
                    for (const tokenTrade of signerTrades) {
                        try {
                            console.log(`Analyzing price for token: ${tokenTrade.mint} (${tokenTrade.changeType})`);
                            const priceAnalysis = await getPriceAnalysis(tokenTrade.mint, tx.blockTime);
                            
                            if (priceAnalysis) {
                                trades.push({
                                    mint: tokenTrade.mint,
                                    tokenBalance: tokenTrade,
                                    tradeType: tokenTrade.changeType,
                                    priceAnalysis: {
                                        purchasePrice: priceAnalysis.purchasePrice,
                                        currentPrice: priceAnalysis.currentPrice,
                                        athPrice: priceAnalysis.athPrice,
                                        athTimestamp: priceAnalysis.athTimestamp,
                                        priceHistoryPoints: priceAnalysis.priceHistory.length
                                    }
                                });
                            } else {
                                trades.push({
                                    mint: tokenTrade.mint,
                                    tokenBalance: tokenTrade,
                                    tradeType: tokenTrade.changeType,
                                    priceAnalysis: null
                                });
                            }
                        } catch (error) {
                            console.error(`Error analyzing price for ${tokenTrade.mint}:`, error);
                            trades.push({
                                mint: tokenTrade.mint,
                                tokenBalance: tokenTrade,
                                tradeType: tokenTrade.changeType,
                                priceAnalysis: null
                            });
                        }
                    }
                    
                    parsedTransactionsArray.push({
                        signature: tx.signature,
                        recentBlockhash: tx.recentBlockhash,
                        blockTime: tx.blockTime,
                        fee: tx.fee,
                        error: tx.error,
                        status: tx.status,
                        accounts: tx.accounts,
                        balances: {
                            signerAddress: tx.balances.signerAddress,
                            solBalance: tx.balances.signerSolBalance,
                            tokenBalances: tx.balances.signerTokenBalances,
                        },
                        trades: trades
                    });
                }
            }
        }

        if (!address) {
            return res.status(400).json({
                message: 'Address is required',
                version: '1.0.0'
            });
        }

        res.json({
            message: 'Transactions retrieved successfully',
            version: '1.0.0',
            trades: serializedBigInt(parsedTransactionsArray)
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error retrieving transactions',
            version: '1.0.0',
            error: error
        });
    }
};