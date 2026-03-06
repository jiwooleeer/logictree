import './styles/app.css';
import { addRoute, start } from './router.js';
import { renderNickname } from './views/nickname.js';
import { renderDashboard } from './views/dashboard.js';
import { renderEditor } from './views/editor.js';
import { renderViewer } from './views/viewer.js';

const app = document.getElementById('app');

addRoute('/', () => renderNickname(app));
addRoute('/dashboard', () => renderDashboard(app));
addRoute('/new', () => renderEditor(app));
addRoute('/edit/:id', (params) => renderEditor(app, params));
addRoute('/view/:id', (params) => renderViewer(app, params));

start();
