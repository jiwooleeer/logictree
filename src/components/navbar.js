import { el } from '../utils/dom.js';
import { getState, setState } from '../state.js';
import { navigate } from '../router.js';
import { showTeacherAuth } from './teacherAuth.js';
import { showStatusPopup } from './statusPopup.js';

export function renderNavbar() {
  const state = getState();

  const nav = el('nav', { className: 'bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40' },
    el('div', { className: 'flex items-center gap-4' },
      el('h1', {
        className: 'text-lg font-bold cursor-pointer',
        onclick: () => navigate('/'),
      }, 'LogicTree'),
      ...(state.nickname
        ? [el('button', {
            className: 'text-sm text-gray-500 hover:text-gray-700',
            onclick: () => showStatusPopup(),
          }, '작성현황')]
        : []),
    ),
    el('div', { className: 'flex items-center gap-3' },
      ...(state.nickname
        ? [
            el('span', { className: 'text-sm text-gray-500' }, state.nickname),
            el('button', {
              className: 'text-sm text-gray-400 hover:text-gray-600',
              onclick: () => {
                setState({ nickname: null });
                navigate('/');
              },
            }, '로그아웃'),
          ]
        : []),
      state.isTeacher
        ? el('button', {
            className: 'text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium hover:bg-amber-200 transition-colors',
            onclick: () => {
              if (!confirm('그레고리 모드를 해제할까요?')) return;
              setState({ isTeacher: false });
              navigate('/dashboard');
            },
          }, '그레고리 모드 ✕')
        : el('button', {
            className: 'text-xs text-gray-400 hover:text-gray-600',
            onclick: () => showTeacherAuth(),
          }, '그레고리 모드'),
    )
  );

  return nav;
}
