import { el, formatDate } from '../utils/dom.js';
import { getState } from '../state.js';
import { addComment, getComments } from '../firebase.js';

export function showCommentPopup(targetId, anchorEl, onPost) {
  // Remove existing popup
  document.querySelector('.comment-popup')?.remove();

  const popup = el('div', { className: 'comment-popup fixed inset-0 z-50 flex items-center justify-center bg-black/30' });

  const listContainer = el('div', { className: 'flex-1 overflow-y-auto space-y-2 min-h-[60px]' },
    el('p', { className: 'text-sm text-gray-400' }, '불러오는 중...')
  );

  const input = el('input', {
    type: 'text',
    className: 'flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900',
    placeholder: '댓글을 입력하세요...',
  });

  const sendBtn = el('button', {
    className: 'px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 shrink-0',
    onclick: async () => {
      const text = input.value.trim();
      if (!text) return;
      const author = getState().nickname || '익명';
      sendBtn.disabled = true;
      sendBtn.textContent = '...';
      await addComment(targetId, author, text);
      input.value = '';
      sendBtn.disabled = false;
      sendBtn.textContent = '전송';
      // Update lastSeen so the commenter doesn't see their own red dot
      const projectId = targetId.split('_')[0];
      localStorage.setItem(`lastSeen_${projectId}`, String(Date.now()));
      if (onPost) onPost();
      await loadComments();
    },
  }, '전송');

  const modal = el('div', { className: 'bg-white rounded-xl shadow-lg w-[28rem] max-h-[70vh] flex flex-col' },
    el('div', { className: 'flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0' },
      el('h4', { className: 'text-sm font-semibold' }, '댓글'),
      el('button', {
        className: 'text-gray-400 hover:text-gray-600 text-lg',
        onclick: () => popup.remove(),
      }, '×'),
    ),
    el('div', { className: 'px-4 py-3 overflow-y-auto flex-1 min-h-0' }, listContainer),
    el('div', { className: 'flex gap-2 px-4 py-3 border-t border-gray-100 shrink-0' }, input, sendBtn),
  );

  popup.appendChild(modal);
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.remove();
  });
  document.body.appendChild(popup);
  input.focus();

  async function loadComments() {
    try {
      const comments = await getComments(targetId);
      listContainer.innerHTML = '';
      if (comments.length === 0) {
        listContainer.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-2' }, '아직 댓글이 없습니다.'));
      } else {
        comments.forEach((c) => {
          listContainer.appendChild(
            el('div', { className: 'bg-gray-50 rounded-lg px-3 py-2' },
              el('div', { className: 'flex items-center justify-between mb-1' },
                el('span', { className: 'text-xs font-medium text-gray-700' }, c.author),
                el('span', { className: 'text-xs text-gray-400' }, formatDate(c.createdAt)),
              ),
              el('p', { className: 'text-sm text-gray-600' }, c.text),
            )
          );
        });
      }
      listContainer.scrollTop = 0;
    } catch (err) {
      listContainer.innerHTML = '';
      listContainer.appendChild(el('p', { className: 'text-sm text-red-400 text-center py-2' }, '댓글을 불러오는 중 오류가 발생했습니다.'));
      console.error('댓글 로딩 오류:', err);
    }
  }

  loadComments();
}
