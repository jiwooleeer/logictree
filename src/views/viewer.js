import { el, clearAndAppend, formatDate, thumbsUpIcon } from '../utils/dom.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { getProject, toggleBadge, getCommentCountsForProject } from '../firebase.js';
import { WRITING_STATUSES, WRITING_STATUS_COLORS } from '../utils/constants.js';
import { renderNavbar } from '../components/navbar.js';
import { renderBlockerRow } from '../components/blockerRow.js';
import { showCommentPopup } from '../components/commentPopup.js';

export async function renderViewer(container, params) {
  const navbar = renderNavbar();
  const content = el('div', { className: 'max-w-3xl mx-auto px-4 py-6' });
  clearAndAppend(container, navbar, content);

  content.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-8' }, '불러오는 중...'));

  const project = await getProject(params.id);
  content.innerHTML = '';

  if (!project) {
    content.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-12' }, '프로젝트를 찾을 수 없습니다.'));
    return;
  }

  const state = getState();

  // Header
  function makeBadgeBtn() {
    if (project.badge) {
      return el('button', {
        className: `inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700 ${state.isTeacher ? 'cursor-pointer hover:bg-amber-200 transition-colors' : 'cursor-default'}`,
        onclick: async () => {
          if (!state.isTeacher) return;
          await toggleBadge(project.id, project.badge);
          project.badge = !project.badge;
          badgeContainer.innerHTML = '';
          badgeContainer.appendChild(makeBadgeBtn());
        },
      },
        thumbsUpIcon(16),
        '참잘했어요',
      );
    }
    if (state.isTeacher) {
      return el('button', {
        className: 'inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors',
        onclick: async () => {
          await toggleBadge(project.id, project.badge);
          project.badge = !project.badge;
          badgeContainer.innerHTML = '';
          badgeContainer.appendChild(makeBadgeBtn());
        },
      },
        thumbsUpIcon(16),
      );
    }
    return el('span', {});
  }

  const badgeContainer = el('div', {});
  badgeContainer.appendChild(makeBadgeBtn());

  const isOwner = state.nickname && state.nickname.toLowerCase() === (project.nickname || '').toLowerCase();

  content.appendChild(
    el('div', { className: 'flex items-center gap-3 mb-2' },
      el('button', {
        className: 'text-sm text-gray-500 hover:text-gray-700',
        onclick: () => navigate('/dashboard'),
      }, '← 돌아가기'),
      el('div', { className: 'flex-1' }),
      ...(isOwner ? [el('button', {
        className: 'text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded-lg',
        onclick: () => navigate(`/edit/${project.id}`),
      }, '수정하기')] : []),
      badgeContainer,
    )
  );

  // Goal comment button
  const goalCommentCount = { value: 0 };
  function goalCommentIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
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

  const goalCountSpan = el('span', { className: 'text-xs' }, '');
  const goalDot = el('span', { className: 'w-2 h-2 bg-red-500 rounded-full hidden' });
  const goalCommentBtn = el('button', {
    className: 'relative inline-flex items-center gap-0.5 rounded-md p-1 shrink-0 transition-colors text-gray-300 hover:text-gray-600 hover:bg-gray-100',
    title: '댓글',
    onclick: (e) => {
      e.stopPropagation();
      goalDot.classList.add('hidden');
      showCommentPopup(`${project.id}_goal`, e.currentTarget, () => {
        goalCommentCount.value++;
        goalCountSpan.textContent = String(goalCommentCount.value);
        goalCommentBtn.classList.remove('text-gray-300');
        goalCommentBtn.classList.add('text-gray-600');
      });
    },
  }, goalCommentIcon(), goalCountSpan, goalDot);

  content.appendChild(
    el('div', { className: 'mb-6' },
      el('div', { className: 'flex items-center gap-2 mb-2' },
        el('span', { className: 'text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full' }, project.nickname),
        el('span', { className: 'text-xs text-gray-400' }, formatDate(project.createdAt)),
        ...(project.writingStatus
          ? [el('span', {
              className: `text-xs px-2 py-0.5 rounded-full ${WRITING_STATUS_COLORS[project.writingStatus] || ''}`,
            }, WRITING_STATUSES[project.writingStatus] || '')]
          : []),
      ),
      el('span', { className: 'text-xs text-gray-400 uppercase tracking-wide' }, '목표'),
      el('div', { className: 'flex items-center gap-2 mt-1' },
        el('h2', { className: 'text-xl font-bold text-gray-900' }, project.goal || '(목표 미작성)'),
        goalCommentBtn,
      ),
    )
  );

  // Blockers
  const lastSeenAt = parseInt(localStorage.getItem(`lastSeen_${project.id}`) || '0', 10);
  const { counts: allCommentCounts, latestAt: allLatestAt } = await getCommentCountsForProject(project.id);

  // Update goal comment button with counts
  const goalCount = allCommentCounts['_goal'] || 0;
  const goalLatest = allLatestAt['_goal'] || 0;
  if (goalCount > 0) {
    goalCommentCount.value = goalCount;
    goalCountSpan.textContent = String(goalCount);
    goalCommentBtn.classList.remove('text-gray-300');
    goalCommentBtn.classList.add('text-gray-600');
    if (goalLatest > lastSeenAt) goalDot.classList.remove('hidden');
  }
  const blockersContainer = el('div', { className: 'space-y-4' });
  (project.content || []).forEach((blocker, i) => {
    // Skip completely empty blockers
    const hasContent = blocker.blocker ||
      (blocker.reasons || []).some((r) => r.text || (r.hypotheses || []).some((h) => h.text || h.lessonLearned));
    if (!hasContent) return;

    // Filter comment counts for this blocker
    const prefix = `_${i}`;
    const blockerCounts = {};
    const blockerLatestAt = {};
    for (const [key, val] of Object.entries(allCommentCounts)) {
      if (key.startsWith(prefix)) {
        blockerCounts[key.slice(prefix.length)] = val;
      }
    }
    for (const [key, val] of Object.entries(allLatestAt)) {
      if (key.startsWith(prefix)) {
        blockerLatestAt[key.slice(prefix.length)] = val;
      }
    }

    blockersContainer.appendChild(
      renderBlockerRow(blocker, i, {
        readonly: true,
        onUpdate: () => {},
        onRemove: () => {},
        commentCounts: blockerCounts,
        commentLatestAt: blockerLatestAt,
        lastSeenAt,
        isSelected: blocker.selected,
        onComment: (suffix, anchorEl, onPost) => {
          showCommentPopup(`${project.id}_${i}${suffix}`, anchorEl, onPost);
        },
      })
    );
  });

  if (blockersContainer.children.length === 0) {
    blockersContainer.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-8' }, '작성된 내용이 없습니다.'));
  }

  content.appendChild(blockersContainer);

  localStorage.setItem(`lastSeen_${project.id}`, String(Date.now()));
}
