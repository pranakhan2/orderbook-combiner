const fetch = require('node-fetch');

module.exports = (app) => {

// a little resuable error handler for fetch
const handleFetchError = (response) => {
  if (!response.ok) {
    console.log('fetch Error: ', response);
    throw Error(response.statusText);
  }
  return response;
};

app.get('/api/get-market-data', (req, res) => {
  // get a list of currency pairs available from both exchanges
  const poloniex_url = 'https://poloniex.com/public?command=returnTicker';
  const bittrex_url = 'https://bittrex.com/api/v1.1/public/getmarketsummaries';

  Promise.all([
    fetch(poloniex_url).then(handleFetchError).then(res => res.json()),
    fetch(bittrex_url).then(handleFetchError).then(res => res.json()),
  ]).then(([poloniex, bittrex]) => {

    let bittrex_raw_data = bittrex.result,
        poloniex_raw_data = poloniex,
        bittrex_markets = new Map(),
        market_summary = {};

    // Unfortunately, Bittrex returns a large array of objects containing market data which
    // means we would have to repeatedly loop through it to look for matching data. In the 
    // interest of speed we'll convert the bittrex data into a Map in one pass so
    // all subsequent indexes are fast.
    bittrex_raw_data.forEach(item => {
      bittrex_markets.set(item.MarketName.replace('-', '_'), item);
    });

    // now that we have a quickly indexed way to get bittrex market data, we'll loop through 
    // poloniex markets and if we find a matching market on bittrex we'll create a custom
    // summary for both 
    let b_mkt = null, p_mkt = null;

    Object.keys(poloniex_raw_data).forEach(item => {

      // if there is a matching market on bittrex, add it to our summary object
      if (b_mkt = bittrex_markets.get(item)) {
        p_mkt = poloniex_raw_data[item];

        //console.log('b_mkt: ', b_mkt);
        //console.log('p_mkt: ', p_mkt);

        // setup the market_summary data we'll send back to the client
        market_summary[item] = {
          name: item,
          data: {
            poloniex: {
              last: p_mkt.last,
              high: p_mkt.highestBid,
              low: p_mkt.lowestAsk,
              volume: p_mkt.quoteVolume,
            },
            bittrex: {
              last: b_mkt.Last,
              high: b_mkt.High,
              low: b_mkt.Low,
              volume: b_mkt.Volume,
            },
          },
        }; 
      }

    });

    // to determine which markets are available on both exchanges 
    res.json(market_summary);
  });


});

 // /api/get-order-books/:pair where :pair is the currency pair we want to look 
 // at defined in the format: XXX-YYY, ie: BTC-ETH, BTC-USD, etc.
 // use the endpoint /api/get-pairs to get the currency pairs available on both exchanges
 app.get('/api/get-order-books/:market', (req, res) => {
    // retreive order book data from Poloniex and Bittrex and 
    // return to the client to chart. 
    // We'll do the order book data munging prior to plotting on the client
    // for performance. If this was a really busy application, it's better to move
    // that kind of processing to the client so the server can respond to requests
    // as quickly as possible.
  
    // retreive Bittrex order book data for BTC_ETH market
    const bittrex_url = `https://bittrex.com/api/v1.1/public/getorderbook?market=${req.params.market.replace('_', '-')}&type=both`;
    const poloniex_url = `https://poloniex.com/public?command=returnOrderBook&currencyPair=${req.params.market}&depth=100`;

    // retrieve the two order books in "parallel"
    Promise.all([
      fetch(bittrex_url).then(handleFetchError).then(res => res.json()),
      fetch(poloniex_url).then(handleFetchError).then(res => res.json()),
    ]).then(values => {
      // what happens if there is an error? poloniex went into maintenance mode while I 
      // was working on this. Need to handle this problem better.

      // munge the poloniex orderbook data into similar formats then 
      // store the returned orderbook data into an orderbooks object
      let p_data = {
        buy:  values[1].bids.map((d) => { 
          return {
            Quantity: d[1],
            Rate: d[0],
          }; 
        }),
        sell: values[1].asks.map((d) => {
          return {
            Quantity: d[1],
            Rate: d[0],
          }
        }),
      }; 

      let orderbooks = {
        bittrex_data: values[0].result,
        poloniex_data: p_data,
      };
      // send the result back to the client
      res.json(orderbooks);
    });
  });
}