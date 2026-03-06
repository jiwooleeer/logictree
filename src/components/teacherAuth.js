import { el } from '../utils/dom.js';
import { setState } from '../state.js';

export function showTeacherAuth() {
  const overlay = el('div', { className: 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center' });

  const errorMsg = el('p', { className: 'text-red-500 text-sm hidden mt-2' }, '비밀번호가 틀렸습니다.');
  const input = el('input', {
    type: 'password',
    className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900',
    placeholder: '비밀번호를 입력하세요',
  });

  const modal = el('div', { className: 'bg-white rounded-xl shadow-lg p-6 w-80' },
    el('h3', { className: 'text-base font-semibold mb-4' }, '선생님 인증'),
    input,
    errorMsg,
    el('div', { className: 'flex gap-2 mt-4' },
      el('button', {
        className: 'flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50',
        onclick: () => overlay.remove(),
      }, '취소'),
      el('button', {
        className: 'flex-1 text-sm px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800',
        onclick: () => {
          if (input.value === import.meta.env.VITE_TEACHER_PASSWORD) {
            setState({ isTeacher: true });
            overlay.remove();
            window.dispatchEvent(new Event('hashchange'));
          } else {
            errorMsg.classList.remove('hidden');
          }
        },
      }, '확인'),
    )
  );

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  input.focus();
}
