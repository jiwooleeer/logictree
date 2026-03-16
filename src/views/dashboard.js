import { el, clearAndAppend, formatDate } from '../utils/dom.js';
import { getState, setState } from '../state.js';
import { navigate } from '../router.js';
import { getProjects, loadDrafts, getCommentCountsForProject, getCommentsForProject } from '../firebase.js';
import { renderNavbar } from '../components/navbar.js';
import { renderProjectCard } from '../components/projectCard.js';

// 임시저장 선택 모달
function showDraftSelectModal(drafts, onSelect) {
  const overlay = el('div', {
    className: 'fixed inset-0 bg-black/40 flex items-center justify-center z-50',
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });

  const modal = el('div', {
    className: 'bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden',
  });

  modal.appendChild(
    el('div', { className: 'flex items-center justify-between px-5 py-4 border-b border-gray-100' },
      el('h3', { className: 'font-semibold text-gray-900 text-sm' }, '임시저장 목록'),
      el('button', {
        className: 'text-gray-400 hover:text-gray-600 text-lg leading-none',
        onclick: () => document.body.removeChild(overlay),
      }, '×'),
    )
  );

  const list = el('div', { className: 'max-h-72 overflow-y-auto divide-y divide-gray-100' });

  if (drafts.length === 0) {
    list.appendChild(
      el('p', { className: 'text-sm text-gray-400 text-center py-10' }, '저장된 임시 저장본이 없습니다.')
    );
  } else {
    drafts.forEach((draft) => {
      const item = el('button', {
        className: 'w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors',
        onclick: () => {
          document.body.removeChild(overlay);
          onSelect(draft);
        },
      },
        el('div', { className: 'text-sm font-medium text-gray-900 truncate' }, draft.goal || '(목표 미작성)'),
        el('div', { className: 'text-xs text-gray-400 mt-0.5' }, formatDate(draft.createdAt) || '날짜 정보 없음'),
      );
      list.appendChild(item);
    });
  }

  modal.appendChild(list);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function showCommentsModal(projectsWithComments) {
  const overlay = el('div', {
    className: 'fixed inset-0 bg-black/40 flex items-center justify-center z-50',
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });

  const modal = el('div', {
    className: 'bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col',
  });

  modal.appendChild(
    el('div', { className: 'flex items-center justify-between px-5 py-4 border-b border-gray-100' },
      el('h3', { className: 'font-semibold text-gray-900 text-sm' }, '내 댓글'),
      el('button', {
        className: 'text-gray-400 hover:text-gray-600 text-lg leading-none',
        onclick: () => document.body.removeChild(overlay),
      }, '×'),
    )
  );

  const content = el('div', { className: 'flex-1 overflow-y-auto p-5 space-y-6' });

  // 로딩 표시
  content.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-10' }, '댓글을 불러오는 중...'));

  if (projectsWithComments.length === 0) {
    content.innerHTML = '';
    content.appendChild(
      el('p', { className: 'text-sm text-gray-400 text-center py-10' }, '댓글 달린 프로젝트가 없습니다.')
    );
  } else {
    // 모든 프로젝트의 댓글을 가져와서 최신순으로 정렬
    const commentPromises = projectsWithComments.map(({ project }) => getCommentsForProject(project.id));
    Promise.all(commentPromises).then(commentsArrays => {
      const allComments = [];
      commentsArrays.forEach((comments, idx) => {
        const project = projectsWithComments[idx].project;
        comments.forEach(comment => {
          allComments.push({ project, comment });
        });
      });
      // 최신순 정렬
      allComments.sort((a, b) => (b.comment.createdAt?.toMillis?.() || 0) - (a.comment.createdAt?.toMillis?.() || 0));
      renderComments(allComments);
    }).catch(err => {
      content.innerHTML = '';
      content.appendChild(el('p', { className: 'text-sm text-red-400 text-center py-10' }, '댓글을 불러오는 중 오류가 발생했습니다.'));
      console.error(err);
    });

    function renderComments(comments) {
      const currentState = getState();
      content.innerHTML = '';
      // 자신의 댓글 제외
      const filteredComments = comments.filter(({ comment }) => comment.author !== currentState.nickname);
      if (filteredComments.length === 0) {
        content.appendChild(
          el('p', { className: 'text-sm text-gray-400 text-center py-10' }, '다른 사람의 댓글이 없습니다.')
        );
        return;
      }
      filteredComments.forEach(({ project, comment }) => {
        const isRead = localStorage.getItem(`readComment_${comment.id}`) === 'true';
        const commentDiv = el('div', {
          className: 'border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors relative',
          onclick: () => {
            localStorage.setItem(`readComment_${comment.id}`, 'true');
            // 점 제거
            const dot = commentDiv.querySelector('.unread-dot');
            if (dot) dot.remove();
            document.body.removeChild(overlay);
            navigate(`/view/${project.id}`);
          }
        },
          el('div', { className: 'flex items-center justify-between mb-1' },
            el('h4', { className: 'text-sm font-medium text-gray-900' }, project.goal || '(목표 미작성)'),
            el('span', { className: 'text-xs text-gray-400' }, formatDate(comment.createdAt)),
          ),
          el('div', { className: 'mb-1' },
            el('span', { className: 'text-sm font-medium text-gray-600' }, `${comment.author}: `),
            el('span', { className: 'text-base text-gray-700' }, comment.text),
          ),
        );
        if (!isRead) {
          commentDiv.appendChild(el('div', { className: 'unread-dot absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full' }));
        }
        content.appendChild(commentDiv);
      });
    }
  }

  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

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
    value: state.dashboardFilter,
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
          const drafts = await loadDrafts(state.nickname);
          if (drafts.length === 0) {
            alert('저장된 임시 저장본이 없습니다.');
          } else if (drafts.length === 1) {
            // 하나뿐이면 바로 이동
            navigate(`/edit/${drafts[0].id}`);
          } else {
            showDraftSelectModal(drafts, (draft) => navigate(`/edit/${draft.id}`));
          }
        },
      }, '내 임시저장 불러오기'),
      el('button', {
        className: 'border border-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors',
        onclick: async () => {
          // 내 프로젝트의 댓글 로드
          const projects = await getProjects(state.nickname);
          console.log('내 프로젝트들:', projects);
          const commentResults = await Promise.all(
            projects.map((p) => getCommentCountsForProject(p.id))
          );
          console.log('댓글 결과:', commentResults);
          const projectsWithComments = projects
            .map((p, idx) => ({ project: p, commentCount: commentResults[idx].total }))
            .filter(({ commentCount }) => commentCount > 0);
          console.log('댓글 달린 프로젝트들:', projectsWithComments);
          showCommentsModal(projectsWithComments);
        },
      }, '댓글'),
    ),
    filterInput,
  );

  const grid = el('div', { className: 'bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-visible' });
  content.appendChild(header);
  content.appendChild(grid);

  const PAGE_SIZE = 20;
  let allProjects = [];
  let allCommentResults = [];
  let displayedCount = 0;
  let moreBtn = null;

  function appendPage() {
    const next = allProjects.slice(displayedCount, displayedCount + PAGE_SIZE);
    next.forEach((p, i) => {
      const idx = displayedCount + i;
      const { total, latestAt } = allCommentResults[idx];
      const lastSeen = parseInt(localStorage.getItem(`lastSeen_${p.id}`) || '0', 10);
      const maxLatest = Object.values(latestAt).reduce((a, b) => Math.max(a, b), 0);
      const hasNew = maxLatest > lastSeen;
      grid.appendChild(renderProjectCard(p, () => load(filterInput.value.trim()), total, hasNew));
    });
    displayedCount += next.length;

    if (moreBtn) moreBtn.remove();
    if (displayedCount < allProjects.length) {
      moreBtn = el('button', {
        className: 'w-full py-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors',
        onclick: () => appendPage(),
      }, `더보기 (${allProjects.length - displayedCount}개 남음)`);
      grid.appendChild(moreBtn);
    }
  }

  async function load(filter) {
    grid.innerHTML = '';
    displayedCount = 0;
    moreBtn = null;
    grid.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-8' }, '불러오는 중...'));
    try {
      allProjects = await getProjects(filter || null);
      allCommentResults = await Promise.all(
        allProjects.map((p) => getCommentCountsForProject(p.id))
      );
      grid.innerHTML = '';
      if (allProjects.length === 0) {
        grid.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-12' }, '아직 제출된 프로젝트가 없습니다.'));
        return;
      }
      appendPage();
    } catch (err) {
      grid.innerHTML = '';
      grid.appendChild(el('p', { className: 'text-sm text-red-400 text-center py-8' }, '데이터를 불러오는 중 오류가 발생했습니다.'));
      console.error(err);
    }
  }

  let timeout;
  filterInput.addEventListener('input', () => {
    clearTimeout(timeout);
    const value = filterInput.value.trim().toLowerCase();
    timeout = setTimeout(() => {
      setState({ dashboardFilter: value });
      load(value);
    }, 300);
  });

  load();
}
