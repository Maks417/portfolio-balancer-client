import './index.css';
import './sass/app.scss';
import { initAnalytics } from './utils/analytics';
import { initLocale } from './locale';
import { createRouter } from './router';
import { mountHome } from './pages/home';
import { mountCompare } from './pages/compare';
import { mountNotFound } from './pages/notFound';

initAnalytics();
initLocale();

const root = document.getElementById('root');
const shell = document.createElement('div');
shell.className = 'app-shell';
root.appendChild(shell);

createRouter({
  outlet: shell,
  routes: [
    { path: '/', mount: mountHome },
    { path: '/compare', mount: mountCompare },
    { path: '*', mount: mountNotFound },
  ],
});
