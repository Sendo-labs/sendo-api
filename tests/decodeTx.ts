import { getTransactionBySignature } from "../src/services/helius";
import { serializedBigInt } from "../src/utils/decoder/index.js";
import { decodeTxData } from "../src/utils/decoder/index.js";

(async () => {
    const address = "3AU66kovwjGTNFLsucxsTDteMWXPLn9cetLQosAzz1zG";
    // // Pump.fun
    // const signature = "2Gc1K947peKMpxyTNTdV5bpDzc73Qf4kbf6D13z7C3WMtfiBYopJ12vLyfKnJvDYUWnxa3eXoJbBFiE3bGsECHKi"
    // Pump.fun 2
    const signature = "3A45iT9hcPkrGCAqgUsdTFAQoGmPb3SCy2Ahn5bocHg9ZzLs9HohjQLd215ka2j4kPe5mgXtuepgtDqct4zwSVgN"
    // Pump.fun AMM
    // const signature = "61rADxvEr2bD35J8iELscbTKG8rCi5rokqgPZmEEstuxZcMLtUpsgha5H7dCTxbuJnzLJRAyQuACJ6YZcNhJFB3g"
    // Jupiter/meteora
    // const signature = "232253CXM2KXwGfSob8yJweXTSpWnzdNcV9HHVcicjJ6rFmCU8rcVyKKWbQucQanMKh8HoG4mrF6WaEHwSe1qGcc"
    // Meteora
    // const signature = "4FjPfEAv28Wot8Snw1qarSk8y9mKe6MK4uz4ERmebXX8QmiSY19ZQihNW7u8hwgxcH6h4EmzsgzKPtGfpQfkGrzw"
    // Orca
    // const signature = "2UAnSJBCsLe77WmoViJpbgPfAz6TiNThBTvwR95tYze58NkLm5dCkk9WEcqxazScnDjot78ouDm4sx8kL9KXZ64E"
    // Jupiter / Orca / PumpfunAMM / Meteora
    // const signature = "3jJoLhLzfDu9uvq1PZME5xrW7FjaZpMZLfD5c2uXxadRNBvfMn4XN8cPk6TnHuk9i4TDrbRSqf5XfhVXyEERZ2ER"
    // Whirlpool
    // const signature = "5XLWMWa1XER2JHa4mXk3uSEkbg1vtvvekLELgmoa3YpriUqwNFPUX3AWbVqM7QEndSKECf9QZ5uoUZzYobMfoHYj"
    // Raydium
    // const signature = "36DLsSfaarGEE37cGfvbW7RXRpG36tRE9oyrK5nDkmnXGoWSsqrXoLALAaKN173BHSEyYuZBhKF9uL4Q2dufDcSm"
    // const signatures = await getSignaturesForAddress(address, 5);
    // console.log(signatures);

    // const nfts = await getNftsForAddress(address);
    // console.log(nfts);

    // const tokens = await getTokensForAddress(address);
    // console.log(tokens);

    // const balance = await getBalanceForAddress(address);
    // console.log(balance);

    // const transactions = await getTransactionsForAddress(address, 10);
    // console.log(transactions);
    // const parsedTransactions = getParsedTransactions(transactions);
    // console.log(parsedTransactions);

    const transaction = await getTransactionBySignature(signature);
    console.log(JSON.stringify(serializedBigInt(transaction), null, 2));
    const parsedTransaction = await decodeTxData(transaction);
    console.log(JSON.stringify(serializedBigInt(parsedTransaction), null, 2));

})();