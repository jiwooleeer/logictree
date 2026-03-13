import { el, clearAndAppend } from '../utils/dom.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { getProjects, loadDraft, getCommentCountsForProject } from '../firebase.js';
import { renderNavbar } from '../components/navbar.js';
import { renderProjectCard } from '../components/projectCard.js';

export async function renderDashboard(container) {
  const state = getState();
  if (!state.nickname) {
    navigate('/');
    return;
  }

  const navbar = renderNavbar();
  const content = el('div', { className: 'max-w-3xl mx-auto px-4 py-6' });
  clearAndAppend(container, navbar, content);

  // Header actions
  const filterInput = el('input', {
    type: 'text',
    className: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 w-48',
    placeholder: '닉네임으로 검색...',
  });

  const header = el('div', { className: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6' },
    el('div', { className: 'flex gap-2' },
      el('button', {
        className: 'bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors',
        onclick: () => navigate('/new'),
      }, '새 프로젝트'),
      el('button', {
        className: 'border border-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors',
        onclick: async () => {
          const draft = await loadDraft(state.nickname);
          if (draft) {
            navigate(`/edit/${draft.id}`);
          } else {
            alert('저장된 임시 저장본이 없습니다.');
          }
        },
      }, '내 임시저장 불러오기'),
    ),
    filterInput,
  );

  const grid = el('div', { className: 'bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-visible' });
  content.appendChild(header);
  content.appendChild(grid);

  async function load(filter) {
    grid.innerHTML = '';
    grid.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-8' }, '불러오는 중...'));
    try {
      const projects = await getProjects(filter || null);
      const commentResults = await Promise.all(
        projects.map((p) => getCommentCountsForProject(p.id))
      );
      grid.innerHTML = '';
      if (projects.length === 0) {
        grid.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-12' }, '아직 제출된 프로젝트가 없습니다.'));
        return;
      }
      projects.forEach((p, idx) => {
        const { total, latestAt } = commentResults[idx];
        const lastSeen = parseInt(localStorage.getItem(`lastSeen_${p.id}`) || '0', 10);
        const maxLatest = Object.values(latestAt).reduce((a, b) => Math.max(a, b), 0);
        const hasNew = maxLatest > lastSeen;
        grid.appendChild(renderProjectCard(p, () => load(filterInput.value.trim()), total, hasNew));
      });
    } catch (err) {
      grid.innerHTML = '';
      grid.appendChild(el('p', { className: 'text-sm text-red-400 text-center py-8' }, '데이터를 불러오는 중 오류가 발생했습니다.'));
      console.error(err);
    }
  }

  let timeout;
  filterInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => load(filterInput.value.trim().toLowerCase()), 300);
  });

  load();
}
