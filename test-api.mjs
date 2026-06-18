import { searchStocks } from './server/searchService.js';
import { fetchQuotes } from './server/priceService.js';
import { fetchExchangeRate } from './server/exchangeRateService.js';

console.log('=== API Integration Test ===\n');

const search = await searchStocks('삼성');
console.log('Search 삼성:', search.length, 'results, first:', search[0]?.name);

const searchUs = await searchStocks('AAPL');
console.log('Search AAPL:', searchUs.length, 'results, first:', searchUs[0]?.name);

const quotes = await fetchQuotes(['AAPL', '005930.KS', 'MSFT']);
console.log('\nQuotes:');
for (const q of quotes.quotes) {
  console.log(`  ${q.symbol}: ${q.price} ${q.currency}`);
}
console.log('Quote error:', quotes.error);

const rate = await fetchExchangeRate();
console.log('\nExchange rate:', rate.rate, 'source:', rate.source, 'error:', rate.error);

const ok = quotes.quotes.length >= 2 && rate.rate > 1000;
console.log(ok ? '\n✓ API OK' : '\n✗ API FAILED');
process.exit(ok ? 0 : 1);