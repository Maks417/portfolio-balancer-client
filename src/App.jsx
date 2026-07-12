import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import NotFound from './components/NotFound';
import CompareScenarios from './components/CompareScenarios';
import { LocaleProvider } from './i18n/LocaleContext';

import './sass/app.scss';

const App = () => {
  return (
    <LocaleProvider>
      <Layout>
        <Router
          basename="/portfolio-balancer-client"
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/compare" element={<CompareScenarios />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </Layout>
    </LocaleProvider>
  );
};

export default App;
