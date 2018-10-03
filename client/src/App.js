import React, { Component, createClass } from 'react';
import { Grid, Row, Col } from 'react-bootstrap';
import Select from 'react-select';
import { extent, pairs, ticks, range, merge, max } from 'd3-array';
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

    // I had to do a LOT of data munging here to get this working properly as
    // a conbined orderbook depth chart, im sure there are several optimizations
    // and modularizations I could do to make it better. 

    let p_data = data.poloniex_data;
    let b_data = data.bittrex_data;

    // generate the plottable data. we'll also need to get matching Y-Axis scales for
    // both graphs so they plot relative to each other.

    let buy_series = this.createDataSeries(p_data.buy, b_data.buy, false),
        sell_series = this.createDataSeries(p_data.sell, b_data.sell, true);

    // calculate the max of the y_axis on both series and get our y-axis max range
    let y_axis_buy_max = [
      max(buy_series, (d) => { return d.p_volume; }), 
      max(buy_series, (d) => { return d.b_volume; }),
    ].reduce((a, v) => { return a + v; });

    let y_axis_sell_max = [
      max(sell_series, (d) => { return d.p_volume; }), 
      max(sell_series, (d) => { return d.b_volume; }),
    ].reduce((a, v) => { return a + v; });

    let y_axis_max_range = Math.ceil(max([y_axis_buy_max, y_axis_sell_max]));

    console.log('y_axis_max_range: ', y_axis_max_range);

    let chart_data = {
      buy: buy_series,
      sell: sell_series,
      y_axis_max_range,
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
    }).sort(function (a, b) {
      if (a.label < b.label) return -1;
      else if (a.label > b.label) return 1;
      return 0;
    }); 
    
    let selected_market_data = (
      this.state.selected_market 
        ? this.state.market_data[this.state.selected_market.value].data : null
    );
    
    const pointformat = format('.8f');

    // Eventully I plan to clean up the Tooltip and make it more user friendly and
    // pretty, for now, in the interest of time, I'll leave this for later.
    class CustomTooltip extends React.Component {
      render() {
        const { active } = this.props;
    
        console.log('tooltip props: ', this.props);

        if (active) {
          const { payload, label } = this.props;
          return (
            <div className="custom-tooltip">
              <p className="label">{`${label} : ${payload[0].value}`}</p>
            </div>
          );
        }
    
        return null;
      }
    }
    
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Combined Order Book Experiment</h1>
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
              <Col sm={2} md={2}>
                <div className='market-summary'>
                  <div className='grid-title'>Market Summary</div>
                  <div>
                    <div>Selected Market: {this.state.selected_market.label}</div>
                    <div>
                    <div><b>Poloniex</b></div>
                      <div>Last: {pointformat(selected_market_data.poloniex.last)}</div>
                      <div>Low: {pointformat(selected_market_data.poloniex.low)}</div>
                      <div>High: {pointformat(selected_market_data.poloniex.high)} </div>
                      <div>Volume: {selected_market_data.poloniex.volume}</div>
                    </div>
                    <div>
                    <div><b>Bittrex</b></div>
                    <div>Last: {pointformat(selected_market_data.bittrex.last)}</div>
                      <div>Low: {pointformat(selected_market_data.bittrex.low)}</div>
                      <div>High: {pointformat(selected_market_data.bittrex.high)}</div>
                      <div>Volume: {selected_market_data.bittrex.volume}</div>
                    </div>
                  </div>
                </div>
              </Col>
               <Col sm={2} md={2}>
                <div className='depth-chart'>
                  <div>
                    <div className='grid-title'>Sell</div>
                    <AreaChart width={300} height={300} data={this.state.chart_data.sell}
                        margin={{top: 10, right: 0, left: 0, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="price" reversed/>
                      <YAxis type="number" domain={[0, this.state.chart_data.y_axis_max_range]}/>
                      <Tooltip/>
                      <Area type='monotone' dataKey='b_volume' stackId="1" stroke='#8884d8' fill='#8884d8' />
                      <Area type='monotone' dataKey='p_volume' stackId="1" stroke='#82ca9d' fill='#82ca9d' />
                    </AreaChart>
                  </div>
                  <div>
                    <div className='grid-title'>Buy</div>
                      <AreaChart width={300} height={300} data={this.state.chart_data.buy}
                        margin={{top: 10, right: 0, left: 0, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="price"/>
                      <YAxis  type="number" domain={[0, this.state.chart_data.y_axis_max_range]} orientation="right"/>
                      <Tooltip/>
                      <Area type='monotone' dataKey='b_volume' stackId="1" stroke='#8884d8' fill='#8884d8' />
                      <Area type='monotone' dataKey='p_volume' stackId="1" stroke='#82ca9d' fill='#82ca9d' />
                    </AreaChart>
                  </div>
                </div>
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
