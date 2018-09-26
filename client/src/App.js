import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  state = {
    testValue: 'Failed!',
    combinedOrderBook: null,
  }

  componentDidMount() {
    this.getTestValue();
    this.getCombinedOrderBook();
  }

  getTestValue = () => {
    // get the test value to make sure the local proxy works
    fetch('/api/test')
      .then(res => res.json())
      .then(val => this.setState({testValue: val}));
  }

  getCombinedOrderBook = () => {
    // get the combined order books from both exchanges
    fetch('/api/combine-order-books')
      .then(res => res.json())
      .then(val => {
        this.setState({combinedOrderBook: val});
        console.log('Combined Order Books: ', val);
      });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
        <p>
          Test service state: {this.state.testValue}
        </p>
      </div>
    );
  }
}

export default App;
