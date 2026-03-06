import { el, clearAndAppend } from '../utils/dom.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { getProject, saveProject, submitProject, getCommentCountsForProject } from '../firebase.js';
import { renderNavbar } from '../components/navbar.js';
import { renderBlockerRow } from '../components/blockerRow.js';
import { showCommentPopup } from '../components/commentPopup.js';

export async function renderEditor(container, params) {
  const state = getState();
  if (!state.nickname) {
    navigate('/');
    return;
  }

  const navbar = renderNavbar();
  const content = el('div', { className: 'max-w-3xl mx-auto px-4 py-6' });
  clearAndAppend(container, navbar, content);

  let projectId = params?.id || null;
  let goalValue = '';
  let blockers = [
    { blocker: '', reasons: [{ text: '', category: 'cognitive', hypotheses: [{ text: '', status: 'pending', lessonLearned: '' }] }] },
  ];

  // Load existing project
  if (projectId) {
    content.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-8' }, '불러오는 중...'));
    const project = await getProject(projectId);
    if (project) {
      goalValue = project.goal || '';
      blockers = project.content || blockers;
    }
    content.innerHTML = '';
  }

  const summaryBody = el('div', { className: 'hidden mt-2' });
  const summaryToggle = el('button', {
    className: 'hidden text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:text-gray-700',
    onclick: () => {
      const isOpen = !summaryBody.classList.contains('hidden');
      summaryBody.classList.toggle('hidden');
      summaryToggle.querySelector('span').textContent = isOpen ? '▶' : '▼';
    },
  },
    el('span', {}, '▶'),
    '레슨런 요약',
    el('span', { className: 'ml-1 text-gray-400' }),
  );
  const summaryContainer = el('div', { className: 'bg-gray-50 rounded-xl p-4 mb-6' }, summaryToggle, summaryBody);
  const goalInput = el('input', {
    type: 'text',
    value: goalValue,
    className: 'w-full text-lg border border-gray-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-gray-900',
    placeholder: '달성하고자 하는 목표를 입력하세요',
  });

  const blockersContainer = el('div', { className: 'space-y-4 mb-6' });

  function updateSummary() {
    const lessons = [];
    blockers.forEach((b) => {
      (b.reasons || []).forEach((r) => {
        (r.hypotheses || []).forEach((h) => {
          if (h.lessonLearned) lessons.push(h.lessonLearned);
        });
      });
    });
    if (lessons.length === 0) {
      summaryToggle.classList.add('hidden');
      summaryBody.classList.add('hidden');
      return;
    }
    summaryToggle.classList.remove('hidden');
    summaryToggle.querySelector('span:last-child').textContent = `(${lessons.length})`;
    summaryBody.innerHTML = '';
    lessons.forEach((l) => {
      summaryBody.appendChild(el('p', { className: 'text-sm text-gray-700 mb-1' }, `• ${l}`));
    });
  }

  let editorCommentCounts = {};

  async function renderAllBlockers() {
    if (projectId) {
      const { counts } = await getCommentCountsForProject(projectId);
      editorCommentCounts = counts;
    }
    blockersContainer.innerHTML = '';
    blockers.forEach((blocker, i) => {
      const prefix = `_${i}`;
      const blockerCounts = {};
      for (const [key, val] of Object.entries(editorCommentCounts)) {
        if (key.startsWith(prefix)) {
          blockerCounts[key.slice(prefix.length)] = val;
        }
      }
      blockersContainer.appendChild(
        renderBlockerRow(blocker, i, {
          onUpdate: () => updateSummary(),
          onRemove: () => {
            blockers.splice(i, 1);
            renderAllBlockers();
            updateSummary();
          },
          commentCounts: blockerCounts,
          onComment: (suffix, anchorEl) => {
            if (!projectId) {
              alert('먼저 임시 저장 후 댓글을 달 수 있습니다.');
              return;
            }
            showCommentPopup(`${projectId}_${i}${suffix}`, anchorEl);
          },
        })
      );
    });
  }

  renderAllBlockers();
  updateSummary();

  const statusMsg = el('span', { className: 'text-sm text-gray-400' });

  const actions = el('div', { className: 'flex items-center gap-3' },
    el('button', {
      className: 'text-sm text-gray-500 hover:text-gray-700',
      onclick: () => navigate('/dashboard'),
    }, '← 돌아가기'),
    el('div', { className: 'flex-1' }),
    statusMsg,
    el('button', {
      className: 'border border-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors',
      onclick: async () => {
        statusMsg.textContent = '저장 중...';
        try {
          const data = {
            nickname: state.nickname,
            goal: goalInput.value,
            content: blockers,
            status: 'draft',
          };
          if (projectId) data.id = projectId;
          projectId = await saveProject(data);
          statusMsg.textContent = '저장됨!';
          setTimeout(() => { statusMsg.textContent = ''; }, 2000);
        } catch (err) {
          statusMsg.textContent = '저장 실패';
          console.error(err);
        }
      },
    }, '임시 저장'),
    el('button', {
      className: 'bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors',
      onclick: async () => {
        if (!goalInput.value.trim()) {
          alert('목표를 입력해주세요.');
          return;
        }
        if (!confirm('제출하면 대시보드에 공개됩니다. 제출할까요?')) return;
        statusMsg.textContent = '제출 중...';
        try {
          const data = {
            nickname: state.nickname,
            goal: goalInput.value,
            content: blockers,
            status: 'draft',
          };
          if (projectId) data.id = projectId;
          projectId = await saveProject(data);
          await submitProject(projectId);
          navigate('/dashboard');
        } catch (err) {
          statusMsg.textContent = '제출 실패';
          console.error(err);
        }
      },
    }, '제출'),
  );

  const addBlockerBtn = el('button', {
    className: 'w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors mb-6',
    onclick: () => {
      blockers.push({ blocker: '', reasons: [{ text: '', category: 'cognitive', hypotheses: [{ text: '', status: 'pending', lessonLearned: '' }] }] });
      renderAllBlockers();
    },
  }, '+ 블록커 추가');

  content.appendChild(actions);
  content.appendChild(el('div', { className: 'mt-6' },
    goalInput,
    summaryContainer,
    blockersContainer,
    addBlockerBtn,
  ));
}
