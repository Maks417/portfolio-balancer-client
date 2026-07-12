import React from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext';

const NotFound = () => {
  const { t } = useLocale();
  return (
    <div className="not-found-page">
      <h1>{t('notFound.title')}</h1>
      <p>
        <Link to="/">{t('notFound.back')}</Link>
      </p>
    </div>
  );
};

export default NotFound;
