/**
 * Extraction simple des balances de transactions Solana
 * Met en relation les comptes avec leurs montants
 */

/**
 * Interface pour les changements de balance SOL
 */
export interface SolBalance {
    accountIndex: number;
    address: string;
    preBalance: string;    // En lamports
    postBalance: string;   // En lamports
    change: string;        // En lamports
    uiChange: number;     // En SOL
    changeType: 'increase' | 'decrease' | 'no_change';
}

/**
 * Interface pour les changements de balance de tokens
 */
export interface TokenBalance {
    accountIndex: number;
    address: string;
    mint: string;
    owner: string;
    decimals: number;
    preAmount: string;     // Montant brut
    postAmount: string;    // Montant brut
    preUiAmount: number;   // Montant en unités lisibles
    postUiAmount: number;  // Montant en unités lisibles
    change: string;        // Changement brut
    uiChange: number;     // Changement en unités lisibles
    changeType: 'increase' | 'decrease' | 'no_change';
}

/**
 * Interface pour l'analyse complète des balances
 */
export interface BalanceAnalysis {
    // Balances SOL de tous les comptes
    solBalances: SolBalance[];
    
    // Balances de tokens de tous les comptes
    tokenBalances: TokenBalance[];
    
    // Adresse du signataire (premier compte)
    signerAddress: string;
    
    // Balance SOL du signataire
    signerSolBalance: SolBalance | null;
    
    // Balances de tokens du signataire
    signerTokenBalances: TokenBalance[];
    
    // Changements significatifs (seuil > 0.01)
    significantChanges: {
        solChanges: SolBalance[];
        tokenChanges: TokenBalance[];
    };
    
    // Tous les traders (addresses avec changements significatifs)
    traders: string[];
}

/**
 * Extrait et analyse les balances d'une transaction
 */
export const extractBalances = async (tx: any): Promise<BalanceAnalysis> => {
    // Récupérer tous les comptes (principaux + chargés)
    const accounts = [
        ...tx.transaction.message.accountKeys,
        ...(tx.meta?.loadedAddresses?.writable ?? []),
        ...(tx.meta?.loadedAddresses?.readonly ?? [])
    ];
    
    const signerAddress = accounts[0]; // Premier compte = signataire
    
    // ========================================
    // ANALYSE DES BALANCES SOL
    // ========================================
    const solBalances: SolBalance[] = [];
    
    for (let i = 0; i < accounts.length; i++) {
        const preBalance = tx.meta.preBalances[i];
        const postBalance = tx.meta.postBalances[i];
        
        if (preBalance !== undefined && postBalance !== undefined) {
            const change = BigInt(postBalance) - BigInt(preBalance);
            const uiChange = (Number(postBalance) - Number(preBalance)) / 1e9; // Convertir en SOL
            
            solBalances.push({
                accountIndex: i,
                address: accounts[i],
                preBalance,
                postBalance,
                change: change.toString(),
                uiChange,
                changeType: change > 0n ? 'increase' : change < 0n ? 'decrease' : 'no_change'
            });
        }
    }
    
    // ========================================
    // ANALYSE DES BALANCES DE TOKENS
    // ========================================
    const tokenBalances: TokenBalance[] = [];
    
    // Créer des maps pour les balances pré et post
    const preTokenMap = new Map<string, any>();
    const postTokenMap = new Map<string, any>();
    
    tx.meta.preTokenBalances?.forEach((balance: any) => {
        const key = `${balance.accountIndex}-${balance.mint}-${balance.owner}`;
        preTokenMap.set(key, balance);
    });
    
    tx.meta.postTokenBalances?.forEach((balance: any) => {
        const key = `${balance.accountIndex}-${balance.mint}-${balance.owner}`;
        postTokenMap.set(key, balance);
    });
    
    // Analyser les comptes qui existent avant ET après
    tx.meta.postTokenBalances?.forEach((postBalance: any) => {
        const key = `${postBalance.accountIndex}-${postBalance.mint}-${postBalance.owner}`;
        const preBalance = preTokenMap.get(key);
        
        if (preBalance) {
            const preAmount = preBalance.uiTokenAmount.amount;
            const postAmount = postBalance.uiTokenAmount.amount;
            const change = BigInt(postAmount) - BigInt(preAmount);
            const uiChange = Number(postBalance.uiTokenAmount.uiAmount) - Number(preBalance.uiTokenAmount.uiAmount);
            
            tokenBalances.push({
                accountIndex: postBalance.accountIndex,
                address: accounts[postBalance.accountIndex],
                mint: postBalance.mint,
                owner: postBalance.owner,
                decimals: postBalance.uiTokenAmount.decimals,
                preAmount,
                postAmount,
                preUiAmount: Number(preBalance.uiTokenAmount.uiAmount),
                postUiAmount: Number(postBalance.uiTokenAmount.uiAmount),
                change: change.toString(),
                uiChange,
                changeType: change > 0n ? 'increase' : change < 0n ? 'decrease' : 'no_change'
            });
        } else {
            // NOUVEAU COMPTE CRÉÉ - Pas dans preTokenBalances mais dans postTokenBalances
            const postAmount = postBalance.uiTokenAmount.amount;
            const uiChange = Number(postBalance.uiTokenAmount.uiAmount);
            
            tokenBalances.push({
                accountIndex: postBalance.accountIndex,
                address: accounts[postBalance.accountIndex],
                mint: postBalance.mint,
                owner: postBalance.owner,
                decimals: postBalance.uiTokenAmount.decimals,
                preAmount: "0",
                postAmount,
                preUiAmount: 0,
                postUiAmount: Number(postBalance.uiTokenAmount.uiAmount),
                change: postAmount,
                uiChange,
                changeType: 'increase'
            });
        }
    });
    
    // Analyser les comptes fermés (existent avant mais pas après)
    tx.meta.preTokenBalances?.forEach((preBalance: any) => {
        const key = `${preBalance.accountIndex}-${preBalance.mint}-${preBalance.owner}`;
        const postBalance = postTokenMap.get(key);
        
        if (!postBalance) {
            const preAmount = preBalance.uiTokenAmount.amount;
            const change = BigInt(0) - BigInt(preAmount);
            const uiChange = 0 - Number(preBalance.uiTokenAmount.uiAmount);
            
            tokenBalances.push({
                accountIndex: preBalance.accountIndex,
                address: accounts[preBalance.accountIndex],
                mint: preBalance.mint,
                owner: preBalance.owner,
                decimals: preBalance.uiTokenAmount.decimals,
                preAmount,
                postAmount: "0",
                preUiAmount: Number(preBalance.uiTokenAmount.uiAmount),
                postUiAmount: 0,
                change: change.toString(),
                uiChange,
                changeType: 'decrease'
            });
        }
    });
    
    // ========================================
    // FILTRAGE DES CHANGEMENTS SIGNIFICATIFS
    // ========================================
    const significantSolChanges = solBalances.filter(change => Math.abs(change.uiChange) > 0.01);
    const significantTokenChanges = tokenBalances.filter(change => Math.abs(change.uiChange) > 0.01);
    
    // Trouver tous les traders (addresses avec changements significatifs)
    const traders = new Set<string>();
    significantTokenChanges.forEach(change => traders.add(change.owner));
    significantSolChanges.forEach(change => traders.add(change.address));
    
    // ========================================
    // BALANCES DU SIGNATAIRE
    // ========================================
    const signerSolBalance = solBalances.find(balance => balance.accountIndex === 0) || null;
    const signerTokenBalances = tokenBalances.filter(balance => balance.owner === signerAddress);
    
    return {
        solBalances,
        tokenBalances,
        signerAddress,
        signerSolBalance,
        signerTokenBalances,
        significantChanges: {
            solChanges: significantSolChanges,
            tokenChanges: significantTokenChanges
        },
        traders: Array.from(traders)
    };
};

/**
 * Trouve les changements pour un owner spécifique
 */
export const getOwnerChanges = (analysis: BalanceAnalysis, owner: string): {
    solChanges: SolBalance[];
    tokenChanges: TokenBalance[];
} => {
    return {
        solChanges: analysis.solBalances.filter(change => change.address === owner),
        tokenChanges: analysis.tokenBalances.filter(change => change.owner === owner)
    };
};

/**
 * Trouve les changements pour un mint spécifique
 */
export const getMintChanges = (analysis: BalanceAnalysis, mint: string): TokenBalance[] => {
    return analysis.tokenBalances.filter(change => change.mint === mint);
};

/**
 * Trouve les comptes fermés (qui avaient des tokens avant mais plus après)
 */
export const getClosedAccounts = (analysis: BalanceAnalysis): TokenBalance[] => {
    return analysis.tokenBalances.filter(change => 
        change.changeType === 'decrease' && 
        change.postAmount === "0" && 
        change.postUiAmount === 0
    );
};

/**
 * Trouve les nouveaux comptes créés
 */
export const getNewAccounts = (analysis: BalanceAnalysis): TokenBalance[] => {
    return analysis.tokenBalances.filter(change => 
        change.changeType === 'increase' && 
        change.preAmount === "0" && 
        change.preUiAmount === 0
    );
};

/**
 * Trouve tous les trades du signer (achats et ventes)
 * Analyse tous les comptes token impliqués, pas seulement ceux du signer
 */
export const getSignerTrades = (analysis: BalanceAnalysis): TokenBalance[] => {
    const signerTrades: TokenBalance[] = [];
    
    // Grouper les changements par mint
    const mintGroups = new Map<string, TokenBalance[]>();
    analysis.tokenBalances.forEach(change => {
        if (!mintGroups.has(change.mint)) {
            mintGroups.set(change.mint, []);
        }
        mintGroups.get(change.mint)!.push(change);
    });
    
    // Analyser chaque mint pour détecter les trades du signer
    mintGroups.forEach((changes, mint) => {
        // Trouver les changements du signer pour ce mint
        const signerChanges = changes.filter(change => change.owner === analysis.signerAddress);
        
        if (signerChanges.length > 0) {
            // Le signer a des changements sur ce mint
            signerTrades.push(...signerChanges);
        } else {
            // Vérifier si le signer a créé un nouveau compte pour ce mint
            const newAccounts = changes.filter(change => 
                change.changeType === 'increase' && 
                change.preAmount === "0" && 
                change.preUiAmount === 0
            );
            
            // Si un nouveau compte a été créé et que le signer a perdu du SOL, c'est probablement un achat
            const signerSolChange = analysis.signerSolBalance?.uiChange || 0;
            if (newAccounts.length > 0 && signerSolChange < 0) {
                // Trouver le compte créé qui pourrait appartenir au signer
                // (même si owner n'est pas encore défini, on peut l'inférer du contexte)
                const potentialSignerAccount = newAccounts.find(account => 
                    account.address !== analysis.signerAddress // Pas le compte principal SOL
                );
                
                if (potentialSignerAccount) {
                    signerTrades.push({
                        ...potentialSignerAccount,
                        owner: analysis.signerAddress, // Marquer comme appartenant au signer
                        changeType: 'increase' as const
                    });
                }
            }
        }
    });
    
    return signerTrades;
};

/**
 * Calcule le changement total pour un mint donné
 */
export const getTotalChangeForMint = (analysis: BalanceAnalysis, mint: string): {
    totalIncrease: number;
    totalDecrease: number;
    netChange: number;
} => {
    const mintChanges = getMintChanges(analysis, mint);
    
    const totalIncrease = mintChanges
        .filter(change => change.changeType === 'increase')
        .reduce((sum, change) => sum + change.uiChange, 0);
    
    const totalDecrease = mintChanges
        .filter(change => change.changeType === 'decrease')
        .reduce((sum, change) => sum + Math.abs(change.uiChange), 0);
    
    const netChange = totalIncrease - totalDecrease;
    
    return {
        totalIncrease,
        totalDecrease,
        netChange
    };
};

/**
 * Formate les changements pour l'affichage
 */
export const formatChanges = (analysis: BalanceAnalysis): string => {
    let output = `👤 Signataire: ${analysis.signerAddress}\n\n`;
    
    // Changements SOL significatifs
    if (analysis.significantChanges.solChanges.length > 0) {
        output += "💰 Changements SOL significatifs:\n";
        analysis.significantChanges.solChanges.forEach(change => {
            output += `   ${change.address}: ${change.uiChange.toFixed(6)} SOL (${change.changeType})\n`;
        });
        output += "\n";
    }
    
    // Changements de tokens significatifs
    if (analysis.significantChanges.tokenChanges.length > 0) {
        output += "🪙 Changements de tokens significatifs:\n";
        analysis.significantChanges.tokenChanges.forEach(change => {
            const isClosed = change.postAmount === "0" && change.postUiAmount === 0;
            const isNew = change.preAmount === "0" && change.preUiAmount === 0;
            
            output += `   ${change.mint}: ${change.uiChange.toFixed(6)} (${change.changeType})`;
            if (isClosed) output += " [COMPTE FERMÉ]";
            if (isNew) output += " [NOUVEAU COMPTE]";
            output += `\n`;
            output += `   Owner: ${change.owner}\n`;
            output += `   Pré: ${change.preUiAmount}, Post: ${change.postUiAmount}\n`;
            output += `   ---\n`;
        });
    }
    
    // Traders identifiés
    if (analysis.traders.length > 0) {
        output += `\n🏆 Traders identifiés: ${analysis.traders.length}\n`;
        analysis.traders.forEach((trader, index) => {
            output += `   ${index + 1}. ${trader}\n`;
        });
    }
    
    return output;
};

/**
 * Analyse rapide pour identifier le trader principal
 */
export const getMainTrader = (analysis: BalanceAnalysis): string | null => {
    const traderVolumes = new Map<string, number>();
    
    // Calculer le volume par trader
    analysis.significantChanges.tokenChanges.forEach(change => {
        const currentVolume = traderVolumes.get(change.owner) || 0;
        traderVolumes.set(change.owner, currentVolume + Math.abs(change.uiChange));
    });
    
    analysis.significantChanges.solChanges.forEach(change => {
        const currentVolume = traderVolumes.get(change.address) || 0;
        traderVolumes.set(change.address, currentVolume + Math.abs(change.uiChange));
    });
    
    // Trouver le trader avec le plus gros volume
    let maxVolume = 0;
    let mainTrader: string | null = null;
    
    traderVolumes.forEach((volume, trader) => {
        if (volume > maxVolume) {
            maxVolume = volume;
            mainTrader = trader;
        }
    });
    
    return mainTrader;
};
