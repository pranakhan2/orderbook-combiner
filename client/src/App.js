import React, { Component } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';
import Select from 'react-select';
import { extent, pairs, ticks, range, merge } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { format } from 'd3-format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import './App.css';

class App extends Component {
  state = {
    orderbook_data: null,
    market_data: {},
    selected_market: null,
    chart_data: {
      buy: null,
      sell: null,
    }
  }

  componentDidMount() {
    this.getMarketSummaryData();
  }

  getMarketSummaryData = () => {
    // grab the market data available from the exchanges
    fetch('/api/get-market-data')
      .then(res => res.json())
      .then(res => {
        this.setState({
          market_data: res,
        });
        console.log('Market summary data retrieved: ', res);
      });
  }

  marketSelected = (selected_market) => {
    this.setState({selected_market});
    // load the order books
    this.getOrderBookData(selected_market.value);
    console.log('Market selected: ', selected_market); 
  }

  getOrderBookData = (market) => {
    // get the combined order books from both exchanges
    fetch(`/api/get-order-books/${market}`)
      .then(res => res.json())
      .then(res => {
        // store the data we got for possible use later
        this.setState({orderbook_data: res});
        console.log(`Orderbook data for market ${market} recieved... `);

        // process the order book data for correct plotting
        this.processOrderBookData(res);
      });
  }

  processOrderBookData = (data) => {
    // the data we get from each exchange isnt quite ready to display in a nice
    // and neat stacked area chart. The price points are different, the data formats
    // don't match, and the series length of each also doesnt match. 
    //
    // this function will process the order books data from both exchanges and 
    // generate a matching series of data for each order book that we can then easily
    // plot in a stack area or any other kind of chart we choose.

    let p_data = data.poloniex_data;
    let b_data = data.bittrex_data;

    // PROCESS BUY ORDERS FIRST!
    // 1. get the extents of the price ranges for each order book for the x-axis
    let chart_data = {
      buy: this.createDataSeries(p_data.buy, b_data.buy, false),
      sell: this.createDataSeries(p_data.sell, b_data.sell, true),
    };

    console.log('chart_data: ', chart_data);

    // 4. the data is now munged and ready to plot!
    this.setState({chart_data});
  }

  createDataSeries = (p_data, b_data, reversed) => {
    
    const xscale_length = 51; // the number of ticks on the xscales

    let xscale_range = extent(merge([
      extent(p_data, (d) => { return d.Rate; }),
      extent(b_data, (d) => { return d.Rate; })
    ]));

    console.log('xscale_range: ', xscale_range);

    // 2. now, generate a linear progression of values between those extents used
    // for our x-axis

    let xscale_low = xscale_range[0], xscale_high = xscale_range[1];

    //if (reversed) {
    //  xscale_low = xscale_range[1];
    //  xscale_high = xscale_range[0];
   // }

    let xscale = scaleLinear()
                    .domain([0, xscale_length])
                    .range([xscale_low, xscale_high]);

    let xscale_ticks = range(xscale_length).map((value) => {
      return format('.8f')(xscale(value));
    });

    //xscale_ticks.push(format('.8f')(xscale_range[1]));
    console.log('xscale_ticks: ', xscale_ticks);

    // 3. now, scan through the xscale_ticks array looking up order volume for the given price ranges
    // and add it to a running sum of volume for each exchange and store inside a new data series

    let range_pairs = pairs(xscale_ticks);
    console.log('range_pairs: ', range_pairs);

    let p_accum = 0, b_accum = 0;
    let sum_reducer = (accumulator, currentValue) => { return accumulator + currentValue.Quantity; };

    var series = range_pairs.map((range_pair) => {

      let b_vol = b_data.filter((d) => {
        return d.Rate >= range_pair[0] && d.Rate <= range_pair[1]; 
      });

      let p_vol = p_data.filter((d) => {
        return d.Rate >= range_pair[0] && d.Rate <= range_pair[1]; 
      });

      p_vol = p_vol.length > 0 ? p_vol.reduce(sum_reducer, 0) : 0;
      b_vol = b_vol.length > 0 ? b_vol.reduce(sum_reducer, 0) : 0;

      p_accum += p_vol;
      b_accum += b_vol;

      return {
        price: range_pair[0],
        p_volume: p_accum,
        b_volume: b_accum,
      };
    });

    return series;
  }

  render() {
    let marketOptions = Object.keys(this.state.market_data).map((market_name) => {
      return { value: market_name, label: market_name };
    }); 
    let selected_market_data = (
      this.state.selected_market 
        ? this.state.market_data[this.state.selected_market.value].data : null
    );
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Combined Order Book Experiement</h1>
        </header>
        <p className="App-intro">
          To load and display combined order book information from the Poloniex and Bittrex exchanges,
          first select a currency market from the dropdown below. Note: only markets available on both
          of the exchanges will appear in the list.
        </p>
        <div className='combined-market-view'>
          <div className='market-select center-block'>
          <Select
            value={this.state.selected_market}
            onChange={this.marketSelected}
            options={marketOptions}
          />
          </div>
          { this.state.selected_market &&
          <div className='market-view center-block'>
          <Grid>
            <Row className="show-grid">
              <Col lg={3}>
                <div className='grid-title'>Market Summary</div>
                <div>
                  <div>Selected Market: {this.state.selected_market.label}</div>
                  <div>
                  <div>Poloniex</div>
                    <div>Last: {selected_market_data.poloniex.last}</div>
                    <div>Low: {selected_market_data.poloniex.low}</div>
                    <div>High: {selected_market_data.poloniex.high} </div>
                    <div>Volume: {selected_market_data.poloniex.volume}</div>
                  </div>
                  <div>
                  <div>Bittrex</div>
                  <div>Last: {selected_market_data.bittrex.last}</div>
                    <div>Low: {selected_market_data.bittrex.low}</div>
                    <div>High: {selected_market_data.bittrex.high}</div>
                    <div>Volume: {selected_market_data.bittrex.volume}</div>
                  </div>
                </div>
              </Col>
               <Col lg={3}>
                <div className='grid-title'>Sell</div>
                <br />
                <AreaChart width={600} height={400} data={this.state.chart_data.sell}
                    margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="price"/>
                  <YAxis/>
                  <Tooltip/>
                  <Area type='monotone' dataKey='b_volume' stackId="1" stroke='#8884d8' fill='#8884d8' />
                  <Area type='monotone' dataKey='p_volume' stackId="1" stroke='#82ca9d' fill='#82ca9d' />
                </AreaChart>
              </Col> 
              <Col lg={3}>
                <div className='grid-title'>Buy</div>
                <br />
                  <AreaChart width={600} height={400} data={this.state.chart_data.buy}
                    margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="price"/>
                  <YAxis/>
                  <Tooltip/>
                  <Area type='monotone' dataKey='b_volume' stackId="1" stroke='#8884d8' fill='#8884d8' />
                  <Area type='monotone' dataKey='p_volume' stackId="1" stroke='#82ca9d' fill='#82ca9d' />
                </AreaChart>
              </Col>  
            </Row>
          </Grid>         
          </div>
          }
        </div>
      </div>
    );
  }
}

export default App;
