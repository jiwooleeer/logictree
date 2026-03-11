import { el } from '../utils/dom.js';
import { getState } from '../state.js';
import { saveHelpConfig } from '../firebase.js';

export function helpIcon(sectionKey, helpConfig, onConfigUpdate) {
  const btn = el('button', {
    className: 'inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-gray-400 text-xs font-medium hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0',
    title: '도움말',
    onclick: (e) => {
      e.stopPropagation();
      e._handled = true;
      showHelpPopup(sectionKey, helpConfig, e.currentTarget, onConfigUpdate);
    },
  }, '?');
  return btn;
}

function showHelpPopup(sectionKey, helpConfig, anchorEl, onConfigUpdate) {
  document.querySelector('.help-popup')?.remove();

  const isTeacher = getState().isTeacher;
  const config = helpConfig[sectionKey];

  const overlay = el('div', { className: 'help-popup fixed inset-0 z-50 flex items-center justify-center bg-black/30' });

  let helpInput, placeholderInput;

  const content = el('div', { className: 'px-4 py-3 space-y-3' });

  if (isTeacher) {
    helpInput = el('textarea', {
      className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none',
      rows: '3',
      value: config.help || '',
      placeholder: '도움말 텍스트를 입력하세요...',
    });
    placeholderInput = el('input', {
      type: 'text',
      className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400',
      value: config.placeholder || '',
      placeholder: '플레이스홀더 텍스트를 입력하세요...',
    });
    content.appendChild(el('div', {},
      el('span', { className: 'text-xs font-medium text-gray-500 block mb-1' }, '도움말'),
      helpInput,
    ));
    content.appendChild(el('div', {},
      el('span', { className: 'text-xs font-medium text-gray-500 block mb-1' }, '플레이스홀더'),
      placeholderInput,
    ));
  } else {
    content.appendChild(el('p', { className: 'text-sm text-gray-700' }, config.help || '도움말이 없습니다.'));
  }

  const footer = el('div', { className: 'flex justify-end gap-2 px-4 py-3 border-t border-gray-100' });

  if (isTeacher) {
    const saveBtn = el('button', {
      className: 'px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800',
      onclick: async () => {
        saveBtn.textContent = '저장 중...';
        saveBtn.disabled = true;
        helpConfig[sectionKey] = {
          help: helpInput.value,
          placeholder: placeholderInput.value,
        };
        await saveHelpConfig(helpConfig);
        if (onConfigUpdate) onConfigUpdate(helpConfig);
        overlay.remove();
      },
    }, '저장');
    footer.appendChild(el('button', {
      className: 'px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700',
      onclick: () => overlay.remove(),
    }, '취소'));
    footer.appendChild(saveBtn);
  } else {
    footer.appendChild(el('button', {
      className: 'px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700',
      onclick: () => overlay.remove(),
    }, '닫기'));
  }

  const modal = el('div', { className: 'bg-white rounded-xl shadow-lg w-96 flex flex-col' },
    el('div', { className: 'flex items-center justify-between px-4 py-3 border-b border-gray-100' },
      el('h4', { className: 'text-sm font-semibold' }, '도움말'),
      el('button', {
        className: 'text-gray-400 hover:text-gray-600 text-lg',
        onclick: () => overlay.remove(),
      }, '×'),
    ),
    content,
    footer,
  );

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
