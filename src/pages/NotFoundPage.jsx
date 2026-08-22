import { AppLink } from '../components/AppLink';
import { useLocale } from '../locale';

export function NotFoundPage() {
  const { t } = useLocale();

  return (
    <div className="not-found-page">
      <h1>{t('notFound.title')}</h1>
      <p>
        <AppLink to="/">{t('notFound.back')}</AppLink>
      </p>
    </div>
  );
}
