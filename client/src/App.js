import React, { Component } from 'react';
import { Grid, Row, Col, Clearfix } from 'react-bootstrap';
import Select from 'react-select';
import './App.css';

class App extends Component {
  state = {
    orderbook_data: null,
    market_data: {},
    selected_market: null,
  }

  componentDidMount() {
    this.getMarketData();
    //this.getCombinedOrderBook();
  }

  getMarketData = () => {
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
    console.log('Market selected: ', selected_market); 
  }
  getCombinedOrderBook = (market) => {
    // get the combined order books from both exchanges
    fetch('/api/get-order-books')
      .then(res => res.json())
      .then(res => {
        this.setState({orderbook_data: res});
        console.log(`Orderbook data for market ${market} recieved... `);
      });
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
                <br />
                <p>
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
                </p>
              </Col>
              <Col lg={3}>
                <div className='grid-title'>Bids</div>
                <br />
              </Col> 
              <Col lg={3}>
                <div className='grid-title'>Asks</div>
                <br />
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
