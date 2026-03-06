import { el, clearAndAppend, formatDate, thumbsUpIcon } from '../utils/dom.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { getProject, toggleBadge, getCommentCountsForProject } from '../firebase.js';
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

  content.appendChild(
    el('div', { className: 'flex items-center gap-3 mb-2' },
      el('button', {
        className: 'text-sm text-gray-500 hover:text-gray-700',
        onclick: () => navigate('/dashboard'),
      }, '← 돌아가기'),
      el('div', { className: 'flex-1' }),
      badgeContainer,
    )
  );

  content.appendChild(
    el('div', { className: 'mb-6' },
      el('div', { className: 'flex items-center gap-2 mb-2' },
        el('span', { className: 'text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full' }, project.nickname),
        el('span', { className: 'text-xs text-gray-400' }, formatDate(project.createdAt)),
      ),
      el('span', { className: 'text-xs text-gray-400 uppercase tracking-wide' }, '목표'),
      el('h2', { className: 'text-xl font-bold text-gray-900 mt-1' }, project.goal || '(목표 미작성)'),
    )
  );

  // Lesson learned summary
  const lessons = [];
  (project.content || []).forEach((b) => {
    (b.reasons || []).forEach((r) => {
      (r.hypotheses || []).forEach((h) => {
        if (h.lessonLearned) lessons.push(h.lessonLearned);
      });
    });
  });
  if (lessons.length > 0) {
    const summary = el('div', { className: 'bg-gray-50 rounded-xl p-4 mb-6' },
      el('span', { className: 'text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2' }, '레슨런 요약'),
    );
    lessons.forEach((l) => {
      summary.appendChild(el('p', { className: 'text-sm text-gray-700 mb-1' }, `• ${l}`));
    });
    content.appendChild(summary);
  }

  // Blockers
  const { counts: allCommentCounts } = await getCommentCountsForProject(project.id);
  const blockersContainer = el('div', { className: 'space-y-4' });
  (project.content || []).forEach((blocker, i) => {
    // Skip completely empty blockers
    const hasContent = blocker.blocker ||
      (blocker.reasons || []).some((r) => r.text || (r.hypotheses || []).some((h) => h.text || h.lessonLearned));
    if (!hasContent) return;

    // Filter comment counts for this blocker
    const prefix = `_${i}`;
    const blockerCounts = {};
    for (const [key, val] of Object.entries(allCommentCounts)) {
      if (key.startsWith(prefix)) {
        blockerCounts[key.slice(prefix.length)] = val;
      }
    }

    blockersContainer.appendChild(
      renderBlockerRow(blocker, i, {
        readonly: true,
        onUpdate: () => {},
        onRemove: () => {},
        commentCounts: blockerCounts,
        onComment: (suffix, anchorEl) => {
          showCommentPopup(`${project.id}_${i}${suffix}`, anchorEl);
        },
      })
    );
  });

  if (blockersContainer.children.length === 0) {
    blockersContainer.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-8' }, '작성된 내용이 없습니다.'));
  }

  content.appendChild(blockersContainer);
}
