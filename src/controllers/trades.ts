import { Request, Response } from 'express';
import { getTransactionsForAddress, getNftsForAddress, getTokensForAddress, getBalanceForAddress } from '../services/helius.js';
import { decodeTxData } from '../utils/decoder/index.js';
import { serializedBigInt } from '../utils/decoder/index.js';
import { getPriceAnalysis } from '../services/birdeyes.js';
import { getSignerTrades } from '../utils/decoder/extractBalances.js';

/**
 * Calculate global summary of all trades
 */
const calculateGlobalSummary = (transactions: any[]) => {
    const summary = {
        totalTransactions: transactions.length,
        totalTrades: 0,
        uniqueTokens: new Set<string>(),
        totalVolume: 0,
        totalVolumeUSD: 0,
        totalTokensTraded: 0,
        totalGainLoss: 0,
        profitableTrades: 0,
        losingTrades: 0,
        bestTrade: null as any,
        worstTrade: null as any,
        averageGainLoss: 0,
        totalMissedATH: 0,
        averageMissedATH: 0,
        tokens: new Map<string, any>(),
        // New counters for trade types
        purchases: 0,
        sales: 0,
        noChange: 0
    };

    transactions.forEach(transaction => {
        if (transaction.trades && transaction.trades.length > 0) {
            transaction.trades.forEach((trade: any) => {
                // Count trade types for ALL trades (including no_change)
                if (trade.tradeType === 'increase') {
                    summary.purchases++;
                } else if (trade.tradeType === 'decrease') {
                    summary.sales++;
                } else if (trade.tradeType === 'no_change') {
                    summary.noChange++;
                }
                
                // Skip trades with no actual change (uiChange = 0) for performance calculations
                if (Math.abs(trade.tokenBalance.uiChange) === 0) {
                    return;
                }
                
                summary.totalTrades++;
                summary.uniqueTokens.add(trade.mint);
                
                if (trade.priceAnalysis) {
                    const { purchasePrice, currentPrice, athPrice } = trade.priceAnalysis;
                    const gainLoss = ((currentPrice - purchasePrice) / purchasePrice) * 100;
                    const missedATH = ((athPrice - currentPrice) / athPrice) * 100;
                    
                    // Calculate volume metrics
                    const tokenAmount = Math.abs(trade.tokenBalance.uiChange);
                    const volumeUSD = tokenAmount * purchasePrice;
                    
                    summary.totalTokensTraded += tokenAmount;
                    summary.totalVolumeUSD += volumeUSD;
                    
                    summary.totalGainLoss += gainLoss;
                    summary.totalMissedATH += missedATH;
                    
                    if (gainLoss > 0) {
                        summary.profitableTrades++;
                    } else {
                        summary.losingTrades++;
                    }
                    
                    // Track best and worst trades
                    if (!summary.bestTrade || gainLoss > summary.bestTrade.gainLoss) {
                        summary.bestTrade = {
                            mint: trade.mint,
                            gainLoss: gainLoss,
                            signature: transaction.signature[0],
                            blockTime: transaction.blockTime
                        };
                    }
                    
                    if (!summary.worstTrade || gainLoss < summary.worstTrade.gainLoss) {
                        summary.worstTrade = {
                            mint: trade.mint,
                            gainLoss: gainLoss,
                            signature: transaction.signature[0],
                            blockTime: transaction.blockTime
                        };
                    }
                    
                    // Aggregate by token
                    if (!summary.tokens.has(trade.mint)) {
                        summary.tokens.set(trade.mint, {
                            mint: trade.mint,
                            trades: 0,
                            totalTokensTraded: 0,
                            totalVolumeUSD: 0,
                            totalGainLoss: 0,
                            totalMissedATH: 0,
                            bestGainLoss: 0,
                            worstGainLoss: 0,
                            totalPurchasePrice: 0,
                            totalAthPrice: 0
                        });
                    }
                    
                    const tokenData = summary.tokens.get(trade.mint);
                    tokenData.trades++;
                    tokenData.totalTokensTraded += tokenAmount;
                    tokenData.totalVolumeUSD += volumeUSD;
                    tokenData.totalGainLoss += gainLoss;
                    tokenData.totalMissedATH += missedATH;
                    tokenData.totalPurchasePrice += purchasePrice;
                    tokenData.totalAthPrice += athPrice;
                    tokenData.bestGainLoss = Math.max(tokenData.bestGainLoss, gainLoss);
                    tokenData.worstGainLoss = Math.min(tokenData.worstGainLoss, gainLoss);
                }
            });
        }
    });

    // Calculate averages
    if (summary.totalTrades > 0) {
        summary.averageGainLoss = summary.totalGainLoss / summary.totalTrades;
        summary.averageMissedATH = summary.totalMissedATH / summary.totalTrades;
    }

    // Convert tokens map to array
    const tokensArray = Array.from(summary.tokens.values()).map(token => ({
        ...token,
        averageGainLoss: token.totalGainLoss / token.trades,
        averageMissedATH: token.totalMissedATH / token.trades,
        averageVolumeUSD: token.totalVolumeUSD / token.trades,
        averagePurchasePrice: token.totalPurchasePrice / token.trades,
        averageAthPrice: token.totalAthPrice / token.trades
    }));

    return {
        overview: {
            totalTransactions: summary.totalTransactions,
            totalTrades: summary.totalTrades,
            uniqueTokens: summary.uniqueTokens.size,
            profitableTrades: summary.profitableTrades,
            losingTrades: summary.losingTrades,
            winRate: summary.totalTrades > 0 ? (summary.profitableTrades / summary.totalTrades * 100).toFixed(2) + '%' : '0%',
            // Trade type breakdown
            purchases: summary.purchases,
            sales: summary.sales,
            noChange: summary.noChange
        },
        volume: {
            totalTokensTraded: summary.totalTokensTraded.toLocaleString('en-US', { maximumFractionDigits: 0 }),
            totalVolumeUSD: '$' + summary.totalVolumeUSD.toLocaleString('en-US', { maximumFractionDigits: 2 }),
            averageTradeSizeUSD: summary.totalTrades > 0 ? '$' + (summary.totalVolumeUSD / summary.totalTrades).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$0.00'
        },
        performance: {
            totalGainLoss: summary.totalGainLoss.toFixed(2) + '%',
            averageGainLoss: summary.averageGainLoss.toFixed(2) + '%',
            totalMissedATH: summary.totalMissedATH.toFixed(2) + '%',
            averageMissedATH: summary.averageMissedATH.toFixed(2) + '%'
        },
        bestTrade: summary.bestTrade,
        worstTrade: summary.worstTrade,
        tokens: tokensArray.sort((a, b) => b.totalVolumeUSD - a.totalVolumeUSD)
    };
};

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

        // Utiliser seulement les signatures (rapide)
        // const signatures = await getSignaturesForAddress(address, limit, cursor);
        const result = await getTransactionsForAddress(address, limit, cursor);
        const transactions = result.transactions;
        const signatures = result.signatures;
        const hasMore = result.hasMore;

        const pagination = {
            limit: limit,
            hasMore: hasMore,
            nextCursor: signatures.length > 0 ? signatures[signatures.length - 1] : null,
            currentCursor: cursor || null,
            totalLoaded: transactions.length
        };
        
        // Fetch additional address data in parallel
        const [nfts, tokens, balance] = await Promise.all([
            await getNftsForAddress(address),
            await getTokensForAddress(address),
            await getBalanceForAddress(address)
        ]);

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
                            // Always add the trade to the array
                            let tradeData = {
                                mint: tokenTrade.mint,
                                tokenBalance: tokenTrade,
                                tradeType: tokenTrade.changeType,
                                priceAnalysis: null as any
                            };

                            // Analyze price based on SOL balance change (negative = purchase, positive = sale)
                            const solBalanceChange = tx.balances.signerSolBalance?.uiChange || 0;
                            
                            // Analyze price for both purchases (negative SOL change) and sales (positive SOL change)
                            if (Math.abs(solBalanceChange) > 0.001) { // Threshold to avoid noise from small changes
                                const tradeType = solBalanceChange < 0 ? 'purchase' : 'sale';
                                console.log(`Analyzing price for token ${tradeType} (SOL change: ${solBalanceChange}): ${tokenTrade.mint}`);
                                const priceAnalysis = await getPriceAnalysis(tokenTrade.mint, tx.blockTime);
                                
                                if (priceAnalysis) {
                                    tradeData.priceAnalysis = {
                                        purchasePrice: priceAnalysis.purchasePrice,
                                        currentPrice: priceAnalysis.currentPrice,
                                        athPrice: priceAnalysis.athPrice,
                                        athTimestamp: priceAnalysis.athTimestamp,
                                        priceHistoryPoints: priceAnalysis.priceHistory.length
                                    };
                                }
                            } else {
                                console.log(`Skipping price analysis for ${tokenTrade.changeType} (SOL change: ${solBalanceChange}): ${tokenTrade.mint}`);
                            }

                            trades.push(tradeData);
                        } catch (error) {
                            console.error(`Error processing trade for ${tokenTrade.mint}:`, error);
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

        // Calculate global summary
        const globalSummary = calculateGlobalSummary(parsedTransactionsArray);

        res.json({
            message: 'Transactions retrieved successfully',
            version: '1.0.0',
            summary: globalSummary,
            pagination: pagination,
            global: {
                singatureCount: limit,
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