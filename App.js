import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import './App.css';
import SwapComponent from './Templates/Swap';

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path="/" component={SwapComponent} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
