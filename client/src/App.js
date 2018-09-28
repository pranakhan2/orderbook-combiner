import React, { Component } from 'react';
import { Grid, Row, Col, Clearfix } from 'react-bootstrap';
import './App.css';

class App extends Component {
  state = {
    testValue: 'Failed!',
    orderbook_data: null,
    market_data: {},
    selected_market: null,
  }

  componentDidMount() {
    this.getMarketData();
    //this.getCombinedOrderBook();
  }

  getTestValue = () => {
    // get the test value to make sure the local proxy works
    fetch('/api/test').then(val => this.setState({testValue: val}));
  }

  getMarketData = () => {
    // grab the market data available from the exchanges
    fetch('/api/get-market-data')
      .then(res => res.json())
      .then(res => {
        this.setState({
          market_data: res,
        });
        console.log('Market summary data retrieved...');
      });
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
    let marketItems = Object.keys(this.state.market_data).map((market_name) =>
      <option value={market_name} key={market_name}>{market_name}</option>
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
            <select
              className='form-control'
              title='Select a market to view...'
              id='market_select'
            >
              <option>Select a market to view...</option>
              {marketItems}
            </select>
          </div>
          { this.state.selected_market &&
          <div className='market-view center-block'>
          <Grid>
            <Row className="show-grid">
              <Col lg={3}>
                <div className='grid-title'>Market Summary</div>
                <br />
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
