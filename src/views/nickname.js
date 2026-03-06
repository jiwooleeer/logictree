import { el, clearAndAppend } from '../utils/dom.js';
import { setState } from '../state.js';
import { navigate } from '../router.js';

export function renderNickname(container) {
  const input = el('input', {
    type: 'text',
    className: 'w-full border border-gray-300 rounded-xl px-4 py-3 text-center focus:outline-none focus:ring-2 focus:ring-gray-900',
    placeholder: '닉네임을 입력하세요',
  });

  const handleEnter = () => {
    const nickname = input.value.trim();
    if (!nickname) return;
    setState({ nickname });
    navigate('/dashboard');
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleEnter();
  });

  const page = el('div', { className: 'min-h-screen flex items-center justify-center' },
    el('div', { className: 'text-center w-80' },
      el('h1', { className: 'text-2xl font-bold mb-2' }, 'LogicTree'),
      el('p', { className: 'text-sm text-gray-500 mb-8' }, '문제 해결 프레임워크'),
      input,
      el('button', {
        className: 'w-full mt-4 bg-gray-900 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-800 transition-colors',
        onclick: handleEnter,
      }, '시작하기'),
    ),
  );

  clearAndAppend(container, page);
}
