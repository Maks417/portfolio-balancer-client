import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <h1>404 — страница не найдена</h1>
      <p>
        <Link to="/">Вернуться к калькулятору</Link>
      </p>
    </div>
  );
};

export default NotFound;
