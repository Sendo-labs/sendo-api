import { RateLimiter } from '../src/utils/rateLimiter.js';
import { getHistoricalPrices } from '../src/services/birdeyes.js';
import { helius } from '../src/config/index.js';
import axios from 'axios';

// Test addresses
const TEST_ADDRESS = '3AU66kovwjGTNFLsucxsTDteMWXPLn9cetLQosAzz1zG';
const TEST_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
const TEST_FROM_TIMESTAMP = Math.floor(Date.now() / 1000) - 86400; // 24h ago
const TEST_TO_TIMESTAMP = Math.floor(Date.now() / 1000);

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

// Fonction pour Helius sans rate limiter
async function callHeliusDirectly(address: string, limit: number) {
  return await helius.getSignaturesForAddress(address, { limit });
}

// Fonction pour BirdEye sans rate limiter
async function callBirdEyeDirectly(mint: string, fromTimestamp: number, toTimestamp: number) {
  const BIRDEYE_API_BASE = 'https://public-api.birdeye.so/defi';
  const response = await axios.get(`${BIRDEYE_API_BASE}/history_price`, {
    params: {
      address: mint,
      address_type: 'token',
      type: '30m',
      time_from: fromTimestamp,
      time_to: toTimestamp,
      ui_amount_mode: 'raw'
    },
    headers: {
      'accept': 'application/json',
      'x-chain': 'solana',
      ...(BIRDEYE_API_KEY && { 'X-API-KEY': BIRDEYE_API_KEY })
    },
    timeout: 5000
  });
  
  if (response.data.success && response.data.data.items) {
    return response.data.data.items;
  }
  return [];
}

/**
 * Test une configuration de rate limiter
 */
async function testRateLimiter(
  name: string,
  requestsPerSecond: number,
  burstCapacity: number,
  numRequests: number
): Promise<any> {
  const limiter = new RateLimiter({
    requestsPerSecond,
    burstCapacity,
    adaptiveTiming: true
  });

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  // Simuler des requêtes
  const tasks = Array.from({ length: numRequests }, (_, i) => {
    return limiter.schedule(async () => {
      // Simule une requête qui prend quelques ms
      await new Promise(resolve => setTimeout(resolve, 10));
      return { index: i, timestamp: Date.now() };
    });
  });

  const results = await Promise.allSettled(tasks);

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      errorCount++;
      errors.push(result.reason);
    }
  });

  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000; // seconds
  const actualRPS = numRequests / totalTime;

  const stats = limiter.getStats();

  return {
    name,
    config: {
      requestsPerSecond,
      burstCapacity
    },
    results: {
      totalRequests: numRequests,
      successCount,
      errorCount,
      successRate: ((successCount / numRequests) * 100).toFixed(2) + '%',
      totalTime: totalTime.toFixed(2) + 's',
      actualRPS: actualRPS.toFixed(2),
      queueLength: stats.queueLength,
      consecutiveErrors: stats.consecutiveErrors,
      adaptiveDelay: stats.adaptiveDelay
    }
  };
}

/**
 * Test Helius avec différentes configurations
 */
async function testHeliusConfigurations() {
  console.log('\n🧪 TESTING HELIUS RATE LIMITERS');
  console.log('=' .repeat(60));

  const configs = [
    { rps: 50, burst: 10, requests: 100 },
    { rps: 200, burst: 50, requests: 400 },
    { rps: 500, burst: 100, requests: 1000 }
  ];

  const results: any[] = [];

  for (const config of configs) {
    console.log(`\n⏱️  Testing ${config.rps} req/s (burst: ${config.burst})...`);
    
    const result = await testRateLimiter(
      `Helius ${config.rps} req/s`,
      config.rps,
      config.burst,
      config.requests
    );
    
    results.push(result);
    
    console.log(`✅ ${config.rps} req/s: ${result.results.actualRPS} req/s, ${result.results.successRate} success`);
    console.log(`   Queue: ${result.results.queueLength}, Errors: ${result.results.consecutiveErrors}`);
  }

  // Comparaison
  console.log('\n📊 COMPARISON TABLE');
  console.log('─'.repeat(60));
  console.log('Config      | Total | Success | Time | Actual RPS');
  console.log('─'.repeat(60));
  
  results.forEach(r => {
    console.log(
      `${r.config.requestsPerSecond} req/s`.padEnd(11) + ' | ' +
      `${r.results.totalRequests}`.padEnd(5) + ' | ' +
      `${r.results.successCount}`.padEnd(7) + ' | ' +
      `${r.results.totalTime}`.padEnd(4) + ' | ' +
      `${r.results.actualRPS} req/s`
    );
  });

  return results;
}

/**
 * Test BirdEye avec différentes configurations
 */
async function testBirdEyeConfigurations() {
  console.log('\n\n🧪 TESTING BIRDEYE RATE LIMITERS');
  console.log('=' .repeat(60));

  const configs = [
    { rps: 1, burst: 1, requests: 20 },
    { rps: 50, burst: 10, requests: 100 },
    { rps: 200, burst: 50, requests: 200 }
  ];

  const results: any[] = [];

  for (const config of configs) {
    console.log(`\n⏱️  Testing ${config.rps} req/s (burst: ${config.burst})...`);
    
    const result = await testRateLimiter(
      `BirdEye ${config.rps} req/s`,
      config.rps,
      config.burst,
      config.requests
    );
    
    results.push(result);
    
    console.log(`✅ ${config.rps} req/s: ${result.results.actualRPS} req/s, ${result.results.successRate} success`);
    console.log(`   Queue: ${result.results.queueLength}, Errors: ${result.results.consecutiveErrors}`);
  }

  // Comparaison
  console.log('\n📊 COMPARISON TABLE');
  console.log('─'.repeat(60));
  console.log('Config      | Total | Success | Time | Actual RPS');
  console.log('─'.repeat(60));
  
  results.forEach(r => {
    console.log(
      `${r.config.requestsPerSecond} req/s`.padEnd(11) + ' | ' +
      `${r.results.totalRequests}`.padEnd(5) + ' | ' +
      `${r.results.successCount}`.padEnd(7) + ' | ' +
      `${r.results.totalTime}`.padEnd(4) + ' | ' +
      `${r.results.actualRPS} req/s`
    );
  });

  return results;
}

/**
 * Test réel avec Helius API avec différentes configurations
 */
async function testRealHeliusAPIConfigs() {
  console.log('\n\n🌐 TESTING REAL HELIUS API WITH DIFFERENT CONFIGS');
  console.log('=' .repeat(70));

  const configs = [
    { rps: 50, burst: 10 },
    { rps: 200, burst: 50 },
    { rps: 500, burst: 100 }
  ];

  const numRequests = 100;

  for (const config of configs) {
    console.log(`\n⏱️  Testing Helius with ${config.rps} req/s (burst: ${config.burst})...`);
    
    const limiter = new RateLimiter({
      requestsPerSecond: config.rps,
      burstCapacity: config.burst,
      adaptiveTiming: true
    });

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    let rateLimitErrors = 0;
    const errors: any[] = [];

    const promises = Array.from({ length: numRequests }, (_, i) => {
      return limiter.schedule(async () => {
        try {
          const result = await callHeliusDirectly(TEST_ADDRESS, 10);
          if (result && result.length > 0) {
            successCount++;
            return { success: true, index: i };
          } else {
            errorCount++;
            errors.push({ index: i, error: 'Empty result', status: 'empty' });
            return { success: false, index: i, error: 'Empty result' };
          }
        } catch (error: any) {
          errorCount++;
          const errorInfo = {
            index: i,
            error: error,
            status: error?.response?.status,
            message: error?.message,
            data: error?.response?.data
          };
          errors.push(errorInfo);
          
          if (error?.response?.status === 429) {
            rateLimitErrors++;
          }
          return { success: false, index: i, error };
        }
      });
    });

    const results = await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    const actualRPS = numRequests / totalTime;

    console.log(`✅ ${config.rps} req/s Results:`);
    console.log(`   Success: ${successCount}/${numRequests}`);
    console.log(`   Errors: ${errorCount}/${numRequests}`);
    console.log(`   Rate Limit Errors (429): ${rateLimitErrors}`);
    console.log(`   Total time: ${totalTime.toFixed(2)}s`);
    console.log(`   Actual RPS: ${actualRPS.toFixed(2)} req/s`);
    
    // Afficher TOUS les erreurs
    if (errors.length > 0) {
      console.log(`\n   All errors (${errors.length} total):`);
      errors.forEach((e, idx) => {
        const errorMsg = e.message || e.status || 'Unknown';
        console.log(`     ${idx + 1}. Request ${e.index}: ${errorMsg}`);
      });
    }
    
    const stats = limiter.getStats();
    console.log(`\n   Queue Length: ${stats.queueLength}`);
    console.log(`   Consecutive Errors: ${stats.consecutiveErrors}`);
    console.log(`   Adaptive Delay: ${stats.adaptiveDelay}ms`);
  }
}

/**
 * Test réel avec BirdEye API avec différentes configurations
 */
async function testRealBirdEyeAPIConfigs() {
  console.log('\n\n🌐 TESTING REAL BIRDEYE API WITH DIFFERENT CONFIGS');
  console.log('=' .repeat(70));

  if (!BIRDEYE_API_KEY) {
    console.log('⚠️  BirdEye API key not found. Skipping BirdEye tests.');
    return;
  }

  const configs = [
    { rps: 1, burst: 1 },
    { rps: 50, burst: 10 },
    { rps: 100, burst: 25 }
  ];

  const numRequests = 25;

  for (const config of configs) {
    console.log(`\n⏱️  Testing BirdEye with ${config.rps} req/s (burst: ${config.burst})...`);
    
    const limiter = new RateLimiter({
      requestsPerSecond: config.rps,
      burstCapacity: config.burst,
      adaptiveTiming: true
    });

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    let rateLimitErrors = 0;
    let authErrors = 0;

    const errors: any[] = [];

    const promises = Array.from({ length: numRequests }, (_, i) => {
      return limiter.schedule(async () => {
        try {
          const result = await callBirdEyeDirectly(TEST_MINT, TEST_FROM_TIMESTAMP, TEST_TO_TIMESTAMP);
          if (result && result.length > 0) {
            successCount++;
            return { success: true, index: i };
          } else {
            errorCount++;
            errors.push({ index: i, error: 'Empty result', status: 'empty' });
            return { success: false, index: i, error: 'Empty result' };
          }
        } catch (error: any) {
          errorCount++;
          const errorInfo = {
            index: i,
            error: error,
            status: error?.response?.status,
            message: error?.message,
            data: error?.response?.data
          };
          errors.push(errorInfo);
          
          if (error?.response?.status === 429) {
            rateLimitErrors++;
          } else if (error?.response?.status === 401) {
            authErrors++;
          }
          return { success: false, index: i, error };
        }
      });
    });

    const results = await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    const actualRPS = numRequests / totalTime;

    console.log(`✅ ${config.rps} req/s Results:`);
    console.log(`   Success: ${successCount}/${numRequests}`);
    console.log(`   Errors: ${errorCount}/${numRequests}`);
    console.log(`   Rate Limit Errors (429): ${rateLimitErrors}`);
    console.log(`   Auth Errors (401): ${authErrors}`);
    console.log(`   Total time: ${totalTime.toFixed(2)}s`);
    console.log(`   Actual RPS: ${actualRPS.toFixed(2)} req/s`);
    
    // Afficher TOUS les détails d'erreur
    if (errors.length > 0 || errorCount > 0) {
      console.log(`\n   Error Details (${errors.length} logged, ${errorCount} total):`);
      if (errors.length > 0) {
        errors.forEach((e, idx) => {
          console.log(`     ${idx + 1}. Request ${e.index}: ${e.status || 'empty'} - ${e.message || JSON.stringify(e.error)}`);
        });
      } else {
        console.log(`     (Errors counted but not logged - empty results likely)`);
      }
    }
    
    const stats = limiter.getStats();
    console.log(`\n   Queue Length: ${stats.queueLength}`);
    console.log(`   Consecutive Errors: ${stats.consecutiveErrors}`);
    console.log(`   Adaptive Delay: ${stats.adaptiveDelay}ms`);
  }
}

/**
 * Test principal
 */
async function runAllTests() {
  console.log('🚀 RATE LIMITER PERFORMANCE TESTS');
  console.log('=' .repeat(70));

  try {
    // Afficher les API keys
    console.log('\n📋 Configuration:');
    console.log(`   Helius API Key: ${HELIUS_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   BirdEye API Key: ${BIRDEYE_API_KEY ? '✅ Set' : '❌ Not set'}\n`);

    // Tests réels avec différentes configurations
    console.log('\n🔍 Testing REAL APIs with different rate limit configurations...');
    console.log('⚠️  This will make actual API calls and consume credits!\n');

    await testRealHeliusAPIConfigs();
    await testRealBirdEyeAPIConfigs();

    // Résumé final
    console.log('\n\n📋 FINAL SUMMARY');
    console.log('=' .repeat(70));
    
    console.log('\n✅ Real API tests completed');
    console.log('\n💡 Recommendations based on results:');
    console.log('   - If you see 429 errors, lower the RPS limit');
    console.log('   - If no errors, you can increase the RPS limit');
    console.log('   - Monitor the "Actual RPS" to see real performance');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Exécuter les tests si le fichier est lancé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { 
  testHeliusConfigurations, 
  testBirdEyeConfigurations, 
  testRealHeliusAPIConfigs, 
  testRealBirdEyeAPIConfigs 
};

