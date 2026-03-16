import { el } from '../utils/dom.js';
import { getAllProjects } from '../firebase.js';

const WEEKS = [
  { label: '전체', start: null, end: null },
  { label: '1주차', start: new Date(2026, 2, 10, 9, 0), end: new Date(2026, 2, 17, 9, 0) },
  { label: '2주차', start: new Date(2026, 2, 17, 9, 0), end: new Date(2026, 2, 24, 9, 0) },
  { label: '3주차', start: new Date(2026, 2, 24, 9, 0), end: new Date(2026, 2, 31, 9, 0) },
];

export async function showStatusPopup() {
  document.querySelector('.status-popup')?.remove();

  const overlay = el('div', {
    className: 'status-popup fixed inset-0 z-50 flex items-center justify-center bg-black/30',
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const tableBody = el('tbody', {},
    el('tr', {}, el('td', { className: 'text-sm text-gray-400 text-center py-8', colSpan: '3' }, '불러오는 중...'))
  );

  let selectedWeek = 0;

  const weekBtns = WEEKS.map((w, i) => {
    const btn = el('button', {
      className: `text-sm px-3 py-1 rounded-full transition-colors ${i === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
      onclick: () => {
        selectedWeek = i;
        weekBtns.forEach((b, j) => {
          b.className = `text-sm px-3 py-1 rounded-full transition-colors ${j === i ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
        });
        renderTable();
      },
    }, w.label);
    return btn;
  });

  const modal = el('div', { className: 'bg-white rounded-xl shadow-lg w-[28rem] max-h-[70vh] flex flex-col' },
    el('div', { className: 'flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0' },
      el('h4', { className: 'text-sm font-semibold' }, '작성현황'),
      el('button', {
        className: 'text-gray-400 hover:text-gray-600 text-lg',
        onclick: () => overlay.remove(),
      }, '×'),
    ),
    el('div', { className: 'flex gap-2 px-4 py-3 shrink-0' }, ...weekBtns),
    el('div', { className: 'px-4 pb-4 overflow-y-auto flex-1 min-h-0' },
      el('table', { className: 'w-full' },
        el('thead', {},
          el('tr', { className: 'border-b border-gray-100' },
            el('th', { className: 'text-xs text-gray-500 font-medium text-left py-2' }, '닉네임'),
            el('th', { className: 'text-xs text-gray-500 font-medium text-center py-2' }, '작성중'),
            el('th', { className: 'text-xs text-gray-500 font-medium text-center py-2' }, '작성완료'),
          ),
        ),
        tableBody,
      ),
    ),
  );

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  let allProjects = [];
  try {
    allProjects = await getAllProjects();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = '';
    tableBody.appendChild(
      el('tr', {}, el('td', { className: 'text-sm text-red-400 text-center py-8', colSpan: '3' }, '데이터를 불러오지 못했습니다.'))
    );
    return;
  }

  function renderTable() {
    tableBody.innerHTML = '';
    const week = WEEKS[selectedWeek];

    const filtered = allProjects.filter((p) => {
      if (p.status !== 'submitted') return false;
      if (!week.start) return true;
      const ts = p.createdAt?.toMillis?.() || 0;
      return ts >= week.start.getTime() && ts < week.end.getTime();
    });

    const byNickname = {};
    filtered.forEach((p) => {
      const nick = p.nickname || '(없음)';
      if (!byNickname[nick]) byNickname[nick] = { writing: 0, done: 0 };
      if (p.writingStatus === 'done') {
        byNickname[nick].done++;
      } else {
        byNickname[nick].writing++;
      }
    });

    const sorted = Object.entries(byNickname).sort((a, b) => a[0].localeCompare(b[0]));

    if (sorted.length === 0) {
      tableBody.appendChild(
        el('tr', {}, el('td', { className: 'text-sm text-gray-400 text-center py-8', colSpan: '3' }, '해당 기간에 작성된 글이 없습니다.'))
      );
      return;
    }

    sorted.forEach(([nick, counts]) => {
      tableBody.appendChild(
        el('tr', { className: 'border-b border-gray-50' },
          el('td', { className: 'text-sm text-gray-900 py-2' }, nick),
          el('td', { className: 'text-sm text-center py-2 text-amber-600' }, String(counts.writing)),
          el('td', { className: 'text-sm text-center py-2 text-green-600' }, String(counts.done)),
        )
      );
    });
  }

  renderTable();
}
