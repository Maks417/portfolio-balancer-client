import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import NotFound from './components/NotFound';

import './sass/app.scss'

const App = () => {
  return (
    <Layout>
      <Router future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
      }}
      >
        <Routes>
          <Route exact path='/portfolio-balancer-client' element={<Home />} />
          <Route component={<NotFound />} />
        </Routes>
      </Router>
    </Layout>
  );
}

export default App;
