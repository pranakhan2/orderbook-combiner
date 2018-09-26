const fetch = require('node-fetch');

module.exports = (app) => {

 app.get('/api/combine-order-books', (req, res) => {
    // retreive and combine order book data from Poloniex and Bittrex and 
    // return to the client to chart.

    let orderbooks = {
      bittrex_data: null,
      poloniex_data: null,
    };
  
    // retreive Bittrex order book data for BTC_ETH market
    const bittrex_url = 'https://bittrex.com/api/v1.1/public/getorderbook?market=BTC-ETH&type=both';
    const poloniex_url = 'https://poloniex.com/public?command=returnOrderBook&currencyPair=BTC_ETH&depth=100';

    // first retrieve the bittrex data
    fetch(bittrex_url)
      .then(res => res.json())
      .then(data => {
        orderbooks.bittrex_data = data.result;
        
        // now retreive the poloniex data
        fetch(poloniex_url)
          .then(res => res.json())
          .then(data => {
            orderbooks.poloniex_data = data;

            // now return both results to the client for processing and display
            res.json(orderbooks);
          });
       
      });
  });
}