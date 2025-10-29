import { decodeTxData } from './utils/decoder/index.js';
import { getPriceAnalysis } from './services/birdeyes.js';
import { getSignerTrades } from './utils/decoder/extractBalances.js';

/**
 * Parse transactions with price analysis for each trade
 * @param transactions Raw transaction data from Helius
 * @returns Array of parsed transactions with trades and price analysis
 */
export const parseTransactionsWithPriceAnalysis = async (transactions: any[]) => {
    const parsedTransactionsArray: any[] = [];

    for (const transaction of transactions) {
        const tx = await decodeTxData(transaction);

        if (tx.error === 'SUCCESS') {
            // Extract all trades from the signer
            const signerTrades = getSignerTrades(tx.balances);
            
            if (signerTrades.length > 0) {
                const solBalanceChange = tx.balances.signerSolBalance?.uiChange || 0;
                
                // Create all trade promises in parallel
                const tradePromises = signerTrades.map(async (tokenTrade) => {
                    try {
                        let tradeData = {
                            mint: tokenTrade.mint,
                            tokenBalance: tokenTrade,
                            tradeType: tokenTrade.changeType,
                            priceAnalysis: null as any
                        };

                        // Only analyze price if there's a token change
                        if (tradeData.tokenBalance.uiChange !== 0) {
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
                        }

                        return tradeData;
                    } catch (error) {
                        console.error(`Error processing trade for ${tokenTrade.mint}:`, error);
                        return {
                            mint: tokenTrade.mint,
                            tokenBalance: tokenTrade,
                            tradeType: tokenTrade.changeType,
                            priceAnalysis: null
                        };
                    }
                });
                
                // Execute all trades in parallel (rate limiter controls the flow)
                const trades = await Promise.all(tradePromises);
                
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

    return parsedTransactionsArray;
};

/**
 * Calculate global summary of all trades
 * @param transactions Parsed transactions with trades and price analysis
 * @returns Global summary with overview, volume, performance, best/worst trades, and tokens
 */
export const calculateGlobalSummary = (transactions: any[]) => {
    const summary = {
        totalTransactions: transactions.length,
        totalTrades: 0,
        uniqueTokens: new Set<string>(),
        totalVolume: 0,
        totalVolumeUSD: 0,
        totalVolumeSOL: 0,
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
        purchases: 0,
        sales: 0,
        noChange: 0
    };

    transactions.forEach(transaction => {
        // Calculate total SOL volume (absolute value of SOL balance changes)
        if (transaction.balances?.solBalance?.uiChange) {
            summary.totalVolumeSOL += Math.abs(transaction.balances.solBalance.uiChange);
        }

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
                    
                    // Calculate PnL in USD
                    const gainLossUSD = (currentPrice - purchasePrice) * tokenAmount;
                    const gainLossSOL = gainLossUSD / 150; // Approximate SOL price
                    
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
                            gainLossUSD: gainLossUSD,
                            gainLossSOL: gainLossSOL,
                            signature: transaction.signature[0],
                            blockTime: transaction.blockTime
                        };
                    }
                    
                    if (!summary.worstTrade || gainLoss < summary.worstTrade.gainLoss) {
                        summary.worstTrade = {
                            mint: trade.mint,
                            gainLoss: gainLoss,
                            gainLossUSD: gainLossUSD,
                            gainLossSOL: gainLossSOL,
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
            purchases: summary.purchases,
            sales: summary.sales,
            noChange: summary.noChange
        },
        volume: {
            totalTokensTraded: summary.totalTokensTraded.toLocaleString('en-US', { maximumFractionDigits: 0 }),
            totalVolumeUSD: '$' + summary.totalVolumeUSD.toLocaleString('en-US', { maximumFractionDigits: 2 }),
            totalVolumeSOL: summary.totalVolumeSOL.toFixed(4) + ' SOL',
            averageTradeSizeUSD: summary.totalTrades > 0 ? '$' + (summary.totalVolumeUSD / summary.totalTrades).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$0.00'
        },
        performance: {
            totalGainLoss: summary.totalGainLoss.toFixed(2) + '%',
            averageGainLoss: summary.averageGainLoss.toFixed(2) + '%',
            totalMissedATH: summary.totalMissedATH.toFixed(2) + '%',
            averageMissedATH: summary.averageMissedATH.toFixed(2) + '%'
        },
        bestTrade: summary.bestTrade ? {
            mint: summary.bestTrade.mint,
            gainLoss: summary.bestTrade.gainLoss.toFixed(2) + '%',
            gainLossUSD: '$' + summary.bestTrade.gainLossUSD.toFixed(2),
            gainLossSOL: summary.bestTrade.gainLossSOL.toFixed(4) + ' SOL',
            signature: summary.bestTrade.signature,
            blockTime: summary.bestTrade.blockTime
        } : null,
        worstTrade: summary.worstTrade ? {
            mint: summary.worstTrade.mint,
            gainLoss: summary.worstTrade.gainLoss.toFixed(2) + '%',
            gainLossUSD: '$' + summary.worstTrade.gainLossUSD.toFixed(2),
            gainLossSOL: summary.worstTrade.gainLossSOL.toFixed(4) + ' SOL',
            signature: summary.worstTrade.signature,
            blockTime: summary.worstTrade.blockTime
        } : null,
        tokens: tokensArray.sort((a, b) => b.totalVolumeUSD - a.totalVolumeUSD)
    };
};

