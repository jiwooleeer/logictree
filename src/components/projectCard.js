import { el, formatDate, thumbsUpIcon } from '../utils/dom.js';
import { getState } from '../state.js';
import { toggleBadge, deleteProject } from '../firebase.js';
import { navigate } from '../router.js';
import { WRITING_STATUSES, WRITING_STATUS_COLORS } from '../utils/constants.js';

function commentIconSmall() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
  svg.appendChild(path);
  return svg;
}

export function renderProjectCard(project, onRefresh, commentCount = 0, hasNewComments = false) {
  const state = getState();

  const badgeEl = project.badge
    ? el('span', {
      className: `absolute top-1/2 -translate-y-1/2 -left-24 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shadow-sm ${state.isTeacher ? 'cursor-pointer hover:bg-amber-200 transition-colors' : ''}`,
      onclick: async (e) => {
        e.stopPropagation();
        if (!state.isTeacher) return;
        await toggleBadge(project.id, project.badge);
        if (onRefresh) onRefresh();
      },
    },
      thumbsUpIcon(12),
      '참잘했어요',
    )
    : (state.isTeacher
      ? el('button', {
        className: 'absolute top-1/2 -translate-y-1/2 -left-7 inline-flex items-center gap-1 text-xs p-1 rounded-full bg-gray-100 text-gray-400 shadow-sm cursor-pointer hover:bg-gray-200 transition-colors',
        onclick: async (e) => {
          e.stopPropagation();
          await toggleBadge(project.id, project.badge);
          if (onRefresh) onRefresh();
        },
      },
        thumbsUpIcon(12),
      )
      : null);

  const row = el('div', {
    className: 'relative flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100',
    onclick: () => navigate(`/view/${project.id}`),
  },
    el('span', { className: 'text-sm text-gray-500 w-20 shrink-0 truncate' }, project.nickname),
    el('span', { className: 'text-gray-300 shrink-0' }, '|'),
    el('span', { className: 'text-sm text-gray-900 truncate flex-1' }, project.goal || '(목표 미작성)'),
    ...(commentCount > 0
      ? [el('span', { className: 'relative inline-flex items-center gap-0.5 text-xs text-gray-400 shrink-0' },
          commentIconSmall(),
          String(commentCount),
          ...(hasNewComments
            ? [el('span', { className: 'absolute -top-1 -right-1.5 w-2 h-2 bg-red-500 rounded-full' })]
            : []),
        )]
      : (hasNewComments
        ? [el('span', { className: 'relative inline-flex items-center gap-0.5 text-xs text-gray-400 shrink-0' },
            commentIconSmall(),
            el('span', { className: 'absolute -top-1 -right-1.5 w-2 h-2 bg-red-500 rounded-full' }),
          )]
        : [])),
    ...(project.writingStatus
      ? [el('span', {
          className: `text-xs px-2 py-0.5 rounded-full shrink-0 ${WRITING_STATUS_COLORS[project.writingStatus] || ''}`,
        }, WRITING_STATUSES[project.writingStatus] || '')]
      : []),
    el('span', { className: 'text-gray-200 shrink-0' }, '|'),
    el('span', { className: 'text-xs text-gray-400 shrink-0' }, formatDate(project.submittedAt || project.createdAt)),
    ...(state.isTeacher
      ? [el('button', {
        className: 'text-xs text-red-400 hover:text-red-600 shrink-0',
        onclick: async (e) => {
          e.stopPropagation();
          if (!confirm(`"${project.goal}" 프로젝트를 삭제할까요?`)) return;
          await deleteProject(project.id);
          if (onRefresh) onRefresh();
        },
      }, '삭제')]
      : []),
    ...(badgeEl ? [badgeEl] : []),
  );

  return row;
}
