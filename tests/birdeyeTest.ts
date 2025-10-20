import { getPriceAnalysis } from '../src/services/birdeyes.js';

/**
 * Tests for getPriceAnalysis
 * Iterates over the provided transactions and prints per-token analysis
 */

async function testPriceAnalysis() {
    console.log('🎯 Simple BirdEye Function Test');
    console.log('===============================');
    
    // Test with all your transactions
    const testCases = [
        // {
        //     name: 'Transaction USDC -> SOL (Jupiter)',
        //     mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        //     timestamp: 1757492913,
        //     description: 'Échange USDC vers SOL via Jupiter - Signature: 5j2Myrepei9f1PVqxGSdKqbrtH3AHdesxmF16z5uj9J9LgGUW7qDjQuJdnHMaXKdaxrwvy8FqcFRLZQXkM929Loc'
        // },
        {
            name: 'Transaction YD3xgCvyX2yQXWT6eiSUtEJJrU4AzrVrZkRM4MMpump',
            mint: 'YD3xgCvyX2yQXWT6eiSUtEJJrU4AzrVrZkRM4MMpump',
            timestamp: 1757260816,
            description: 'Vente token Pump.fun - Signature: 4BVAmmSuibCK52Tc3egqgRezQJhkLcMxMeTRvfqHc3vvS3QuJUCF4XhfzmhBYFEr4SrMyDnofeEK1rRezYCt9yMF'
        },
        {
            name: 'Transaction DiEhaRyCBrKoEpBVCBUjNkHT8Kh5CS8oZsUbrvMnpump (1)',
            mint: 'DiEhaRyCBrKoEpBVCBUjNkHT8Kh5CS8oZsUbrvMnpump',
            timestamp: 1757259522,
            description: 'Vente token Pump.fun - Signature: 61rADxvEr2bD35J8iELscbTKG8rCi5rokqgPZmEEstuxZcMLtUpsgha5H7dCTxbuJnzLJRAyQuACJ6YZcNhJFB3g'
        },
        {
            name: 'Transaction DiEhaRyCBrKoEpBVCBUjNkHT8Kh5CS8oZsUbrvMnpump (2)',
            mint: 'DiEhaRyCBrKoEpBVCBUjNkHT8Kh5CS8oZsUbrvMnpump',
            timestamp: 1757259171,
            description: 'Vente token Pump.fun - Signature: 2Gc1K947peKMpxyTNTdV5bpDzc73Qf4kbf6D13z7C3WMtfiBYopJ12vLyfKnJvDYUWnxa3eXoJbBFiE3bGsECHKi'
        },
        // {
        //     name: 'Transaction FhE3mZFqg2fFdjTeKFS3VjEyesumLp4H31mVZLi5pump',
        //     mint: 'FhE3mZFqg2fFdjTeKFS3VjEyesumLp4H31mVZLi5pump',
        //     timestamp: 1757257158,
        //     description: 'Vente token Pump.fun - Signature: 6775b19izcNeY8W1VBxLGcn9C71KVRh53SqxL1BrpTavgVDGjkhzHaDGNm7sH4ZJZQS8U2TTTfpZ8K77hYh1bNqc'
        // },
        // {
        //     name: 'Transaction 5w61qjpywzPT3355EyHkMUvNZ5vUqbVTohcGnj4kpump',
        //     mint: '5w61qjpywzPT3355EyHkMUvNZ5vUqbVTohcGnj4kpump',
        //     timestamp: 1757256263,
        //     description: 'Vente token Pump.fun - Signature: 4eHFkKGxMP6c8djVyNk947FhYKQVBqZEV8y19kSMdfnG9EH8D6REWNcmihXquyoHqWJaQmtRLvjcz9GuveuGA3KD'
        // },
        // {
        //     name: 'Transaction 8WttatccfWznzbMuVYMePaAAxkztaUhQxqMtX3J3pump',
        //     mint: '8WttatccfWznzbMuVYMePaAAxkztaUhQxqMtX3J3pump',
        //     timestamp: 1757256051,
        //     description: 'Vente token Pump.fun - Signature: 2tnLVCP5WCC3EvcWRCzjkMJLDPUpfSrSw7aNaNp2F6aUmyJQw6PDFCKBGuDo3brgnF4gbwPK7MDP1CgC1DzicnTd'
        // },
        // {
        //     name: 'Transaction Hqf9ZfSBdGeY9azy2LadU8KsDicErrRAUrsMsC4Vpump',
        //     mint: 'Hqf9ZfSBdGeY9azy2LadU8KsDicErrRAUrsMsC4Vpump',
        //     timestamp: 1757255867,
        //     description: 'Vente token Pump.fun - Signature: 4MoR9DyexeqZ7kDb8E9euLbGhHBEyBHSANU2QmfpMUDPy8zxMZ1j37htshCJo6ECPyXknjP7w6E5EGNcNSFZFuqn'
        // },
        // {
        //     name: 'Transaction 4PAeV86mHvWikx9UxKr48wM82kDixKS7jthZK7P4pump',
        //     mint: '4PAeV86mHvWikx9UxKr48wM82kDixKS7jthZK7P4pump',
        //     timestamp: 1757255548,
        //     description: 'Vente token Pump.fun - Signature: 3iN4MVkLDQ56Tif8NVBRtRyDnHHBhXhaFMGfqH9oaFa1G1m1bFbYDB5iepuL2NQYpR2xG2RbQrmAJ7DAKQpgExMd'
        // },
        // {
        //     name: 'Transaction 5rkA4M1Fs2iWWwYrv331i4np3zpSwdjwQk4x2rGxpump',
        //     mint: '5rkA4M1Fs2iWWwYrv331i4np3zpSwdjwQk4x2rGxpump',
        //     timestamp: 1757255101,
        //     description: 'Vente token Pump.fun - Signature: WeWkB9H7SLTgrxoMDzecPyqBycVWaVaX44QW6jA1tBQqy7h1pPjaT47JeNGfrq6BXThs3RWsfzL5AVYnM4sX8Sx'
        // },
        // {
        //     name: 'Transaction GgZtu7CxLN6JHCD56GeggAq3v9z8TjeLXZ2BAZtLpump',
        //     mint: 'GgZtu7CxLN6JHCD56GeggAq3v9z8TjeLXZ2BAZtLpump',
        //     timestamp: 1757254589,
        //     description: 'Vente token Pump.fun - Signature: 5Vav6wtFm13UsP6dR85ySFVJup4Waa6ihMFqtAK1s865i8FDpTjrTmu7HMWNXv8WNXUS6S2Y2BHvd5SFG4ti3d5F'
        // },
        // {
        //     name: 'Transaction 4idktNcVA41NLDGRK1GsWkXPDxFyXMyCD8Rhdg3Ypump',
        //     mint: '4idktNcVA41NLDGRK1GsWkXPDxFyXMyCD8Rhdg3Ypump',
        //     timestamp: 1757254010,
        //     description: 'Vente token Pump.fun - Signature: 5HaYpQ42tPsokt9Rnj8ETYoT4Efz9Pxu6cUoHVoTpkymbQmDyY9gePFo9vGVtqTQYsyAvU7ZFMHR8eKN4ghDFwwA'
        // },
        // {
        //     name: 'Transaction FvqMbhyMcWYs9cGdgCmAufnuNbpTa3PcdHSgsVvzpump',
        //     mint: 'FvqMbhyMcWYs9cGdgCmAufnuNbpTa3PcdHSgsVvzpump',
        //     timestamp: 1757253791,
        //     description: 'Vente token Pump.fun - Signature: 5BpFixJQ2s17BbxyiDHY1e4v19eaeeVnEEiYpHfCfCxsj9Y8uDjHdJxVjujmec5pCgcR6jkgVN7rSX8NgeVFs8YP'
        // },
        // {
        //     name: 'Transaction Eo1XP7bm3gS5G12E2QhPrgKrSkgaa2o1d8FZKJ4Mpump',
        //     mint: 'Eo1XP7bm3gS5G12E2QhPrgKrSkgaa2o1d8FZKJ4Mpump',
        //     timestamp: 1757253092,
        //     description: 'Vente token Pump.fun - Signature: pnHxyTaeQm4PCKsHENtmqbWLMG2NTeeVV9xyRA8JbybKxpF7ovFCgsjYysEjCwhg4W2JMUnyzQwgFLDvgKXJgsn'
        // },
        // {
        //     name: 'Transaction 28zePszbuHG83Sqm8qSt5nHohifERWrPwzSStrQCpump',
        //     mint: '28zePszbuHG83Sqm8qSt5nHohifERWrPwzSStrQCpump',
        //     timestamp: 1757251749,
        //     description: 'Vente token Pump.fun - Signature: 2vV4hHwqkKCpVn2yAP3GmgPu6SicK9ht85bk5H26uvxDp4QGkJpBL5UUxWK9qXF391PsCNA4zqNVVGPYkSXsNHDj'
        // },
        // {
        //     name: 'Transaction AkRNsWq7K3EhD1pPCXWTUTffqfTyPHh8hWVjRu4pump',
        //     mint: 'AkRNsWq7K3EhD1pPCXWTUTffqfTyPHh8hWVjRu4pump',
        //     timestamp: 1757251185,
        //     description: 'Vente token Pump.fun - Signature: 57bSR8E4w7pd7vtvZFaE1euGFYAJFtGujT1MYecYVbhcKuEw6VjWfuPtCxQk7rmNBb87hWVxHRC8BnQJ9u8LwK7V'
        // }
    ];

    // Aggregation for a final global summary
    const global = {
        total: 0,
        withData: 0,
        sumGainPct: 0,
        sumMissedPct: 0,
        sumPoints: 0,
        best: { name: '', gainPct: -Infinity },
        worst: { name: '', gainPct: Infinity }
    };

    for (const testCase of testCases) {
        console.log(`\n📊 Test: ${testCase.name}`);
        console.log(`📅 Purchase date: ${new Date(testCase.timestamp * 1000).toISOString()}`);
        console.log(`📝 Description: ${testCase.description}`);
        console.log('---');
        
        try {
            console.log('⏳ Analyzing...');
            const result = await getPriceAnalysis(testCase.mint, testCase.timestamp);
            
            if (result) {
                console.log('✅ Analysis succeeded!');
                console.log('\n📊 RESULTS:');
                console.log(`💰 Purchase price: $${result.purchasePrice.toFixed(8)}`);
                console.log(`💵 Current price: $${result.currentPrice.toFixed(8)}`);
                console.log(`📈 All-time high (ATH): $${result.athPrice.toFixed(8)}`);
                console.log(`📅 ATH date: ${new Date(result.athTimestamp * 1000).toISOString()}`);
                console.log(`📈 Number of points: ${result.priceHistory.length}`);
                
                // Performance calculations
                const gainFromPurchase = ((result.currentPrice - result.purchasePrice) / result.purchasePrice) * 100;
                const missedGains = ((result.athPrice - result.currentPrice) / result.athPrice) * 100; // Correction
                const daysSincePurchase = (Date.now() / 1000 - testCase.timestamp) / (24 * 60 * 60);
                
                console.log('\n🎯 PERFORMANCE:');
                console.log(`📊 Return since purchase: ${gainFromPurchase.toFixed(2)}%`);
                console.log(`📉 Drawdown from ATH: ${missedGains.toFixed(2)}%`);
                console.log(`⏰ Days since purchase: ${daysSincePurchase.toFixed(1)}`);
                
                console.log('\n📋 SUMMARY:');
                if (gainFromPurchase > 0) {
                    console.log(`🎉 Profitable position: +${gainFromPurchase.toFixed(2)}%`);
                } else {
                    console.log(`😞 Losing position: ${gainFromPurchase.toFixed(2)}%`);
                }
                
                if (missedGains > 0) {
                    console.log(`⚠️  You missed ${missedGains.toFixed(2)}% of gains!`);
                } else {
                    console.log(`🎯 You sold at the right time!`);
                }

                // Global aggregation
                global.total += 1;
                global.withData += 1;
                global.sumGainPct += gainFromPurchase;
                global.sumMissedPct += missedGains;
                global.sumPoints += result.priceHistory.length;
                if (gainFromPurchase > global.best.gainPct) global.best = { name: testCase.name, gainPct: gainFromPurchase };
                if (gainFromPurchase < global.worst.gainPct) global.worst = { name: testCase.name, gainPct: gainFromPurchase };
            } else {
                console.log('❌ No data found for this token');
                global.total += 1;
            }
        } catch (error) {
            console.error('❌ Error during test:', error instanceof Error ? error.message : String(error));
        }
        
        console.log('\n' + '='.repeat(50));
    }
    // Global summary footer
    if (global.total > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('\n🧮 GLOBAL SUMMARY');
        console.log('----------------');
        console.log(`📦 Total number of tests: ${global.total}`);
        console.log(`✅ Successful analyses: ${global.withData}`);
        if (global.withData > 0) {
            console.log(`📊 Average return: ${(global.sumGainPct / global.withData).toFixed(2)}%`);
            console.log(`📉 Average drawdown vs ATH: ${(global.sumMissedPct / global.withData).toFixed(2)}%`);
            console.log(`🧾 Average points per analysis: ${(global.sumPoints / global.withData).toFixed(0)}`);
            if (global.best.name) console.log(`🏆 Best performance: ${global.best.name} (${global.best.gainPct.toFixed(2)}%)`);
            if (global.worst.name) console.log(`⚠️ Worst performance: ${global.worst.name} (${global.worst.gainPct.toFixed(2)}%)`);
        }
    }
}

// Exécution des tests
async function runAllTests() {
    try {
        await testPriceAnalysis();
        
        console.log('\n🏁 Test finished');
    } catch (error) {
        console.error('❌ Global error:', error instanceof Error ? error.message : String(error));
    }
}

// Exécuter si le fichier est lancé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { testPriceAnalysis, runAllTests };
