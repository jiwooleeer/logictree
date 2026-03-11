import { el, clearAndAppend } from '../utils/dom.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { getProject, saveProject, submitProject, getHelpConfig, getDefaultHelp } from '../firebase.js';
import { renderNavbar } from '../components/navbar.js';
import { CATEGORIES, STATUSES, STATUS_COLORS } from '../utils/constants.js';
import { helpIcon } from '../components/helpIcon.js';

function toggleIcon(expanded) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.style.transition = 'transform 0.15s ease';
  svg.style.transform = expanded ? 'rotate(90deg)' : 'rotate(0deg)';
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 3l5 5-5 5');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', expanded ? '#111827' : '#9ca3af');
  path.setAttribute('stroke-width', '1.2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  return svg;
}

function makeSelect(options, selected, onChange) {
  const select = el('select', {
    className: 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27M6%209l6%206%206-6%27/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.5rem_center] pr-6',
    onchange: (e) => onChange(e.target.value),
  });
  for (const [value, label] of Object.entries(options)) {
    const opt = el('option', { value }, label);
    if (value === selected) opt.selected = true;
    select.appendChild(opt);
  }
  return select;
}

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
  let currentStatus = 'draft';
  let blockers = [
    { blocker: '', selected: false, reasons: [] },
  ];
  let helpCfg = getDefaultHelp();

  // Load existing project and help config
  content.appendChild(el('p', { className: 'text-sm text-gray-400 text-center py-8' }, '불러오는 중...'));
  const [loadedHelp, loadedProject] = await Promise.all([
    getHelpConfig(),
    projectId ? getProject(projectId) : Promise.resolve(null),
  ]);
  helpCfg = loadedHelp;
  if (loadedProject) {
    goalValue = loadedProject.goal || '';
    blockers = loadedProject.content || blockers;
    currentStatus = loadedProject.status || 'draft';
  }
  content.innerHTML = '';

  const statusMsg = el('span', { className: 'text-sm text-gray-400' });
  function onHelpUpdate(updated) {
    helpCfg = updated;
    goalInput.placeholder = helpCfg.goal.placeholder;
    renderTree();
  }

  const goalInput = el('input', {
    type: 'text',
    value: goalValue,
    className: 'w-full text-sm text-gray-900 placeholder-gray-400 bg-gray-100/70 rounded-lg px-3 py-3 mb-6 focus:outline-none focus:bg-gray-200/70',
    placeholder: helpCfg.goal.placeholder,
  });

  const treeContainer = el('div', {});

  function renderTree() {
    treeContainer.innerHTML = '';

    function addParentHighlight(itemWrapper, row) {
      itemWrapper.addEventListener('focusin', () => {
        row.classList.remove('bg-gray-100/70');
        row.classList.add('bg-blue-100/70');
      });
      itemWrapper.addEventListener('focusout', (e) => {
        if (!itemWrapper.contains(e.relatedTarget)) {
          row.classList.remove('bg-blue-100/70');
          row.classList.add('bg-gray-100/70');
        }
      });
    }

    function sectionHeader(label, sectionKey, onAdd) {
      return el('div', { className: 'flex items-center justify-between mb-2' },
        el('div', { className: 'flex items-center gap-1.5' },
          el('span', { className: 'text-xs font-medium text-gray-500 uppercase tracking-wide' }, label),
          helpIcon(sectionKey, helpCfg, onHelpUpdate),
        ),
        el('button', {
          className: 'text-xs text-gray-400 hover:text-gray-600',
          onclick: (e) => { e._handled = true; onAdd(); },
        }, '+ 추가'),
      );
    }

    function makeRow(item, textKey, placeholder, onToggle, onInput, onRemove, isExpanded) {
      const input = el('input', {
        type: 'text',
        value: item[textKey] || '',
        className: 'flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 placeholder-gray-400',
        placeholder,
        oninput: (e) => { item[textKey] = e.target.value; if (onInput) onInput(); },
      });
      const row = el('div', {
        className: 'flex items-center gap-2 p-3 rounded-lg transition-all bg-gray-100/70',
        onclick: (e) => { e._handled = true; },
      },
        el('button', {
          className: 'shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors',
          onclick: (e) => { e._handled = true; onToggle(); },
        }, toggleIcon(isExpanded)),
        input,
      );
      input.addEventListener('focus', () => {
        row.classList.remove('bg-gray-100/70');
        row.classList.add('bg-blue-100/70');
      });
      input.addEventListener('blur', () => {
        row.classList.remove('bg-blue-100/70');
        row.classList.add('bg-gray-100/70');
      });
      return row;
    }

    function renderLessonInline(hyp) {
      const wrapper = el('div', {
        className: 'ml-6 border-l-2 border-gray-200 pl-4 mt-2',
        onclick: (e) => { e._handled = true; },
      });
      const chips = el('div', { className: 'flex gap-2 mb-3' });
      for (const [value, label] of Object.entries(STATUSES)) {
        const isActive = value === (hyp.status || 'pending');
        const colorClass = isActive ? STATUS_COLORS[value] : 'bg-gray-50 text-gray-400 border border-gray-200';
        chips.appendChild(el('button', {
          className: `text-sm px-4 py-1.5 rounded-full transition-colors ${colorClass}`,
          onclick: () => { hyp.status = value; renderTree(); },
        }, label));
      }
      wrapper.appendChild(el('div', {},
        el('span', { className: 'text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2' }, '검증'),
        chips,
      ));
      if (hyp.status === 'success' || hyp.status === 'fail') {
        wrapper.appendChild(el('div', {},
          el('div', { className: 'flex items-center gap-1.5 mb-2' },
            el('span', { className: 'text-xs font-medium text-gray-500 uppercase tracking-wide' }, '레슨런'),
            helpIcon('lesson', helpCfg, onHelpUpdate),
          ),
          el('textarea', {
            className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-gray-50 resize-none',
            rows: '4',
            placeholder: helpCfg.lesson.placeholder,
            value: hyp.lessonLearned || '',
            oninput: (e) => { hyp.lessonLearned = e.target.value; },
          }),
        ));
      }
      return wrapper;
    }

    function renderHypList(hypotheses) {
      const wrapper = el('div', { className: 'ml-6 border-l-2 border-gray-200 pl-4 mt-2 space-y-2' });
      wrapper.appendChild(sectionHeader('가설', 'hypothesis', () => {
        hypotheses.push({ text: '', status: 'pending', selected: false, lessonLearned: '' });
        renderTree();
      }));
      hypotheses.forEach((hyp, hi) => {
        const row = makeRow(hyp, 'text', helpCfg.hypothesis.placeholder, () => {
          if (hyp.selected) {
            hyp.selected = false;
          } else {
            hypotheses.forEach((h) => h.selected = false);
            hyp.selected = true;
          }
          renderTree();
        }, null, null, hyp.selected);
        row.appendChild(el('button', {
          className: 'text-red-300 hover:text-red-500 text-sm shrink-0',
          onclick: () => {
            hypotheses.splice(hi, 1);
            if (hypotheses.length === 0) hypotheses.push({ text: '', status: 'pending', selected: false, lessonLearned: '' });
            renderTree();
          },
        }, '\u00D7'));
        const hypItem = el('div', {});
        hypItem.appendChild(row);
        if (hyp.selected) {
          const lessonEl = renderLessonInline(hyp);
          lessonEl.classList.add('mb-4');
          hypItem.appendChild(lessonEl);
        }
        addParentHighlight(hypItem, row);
        wrapper.appendChild(hypItem);
      });
      return wrapper;
    }

    function renderReasonList(reasons) {
      const wrapper = el('div', { className: 'ml-6 border-l-2 border-gray-200 pl-4 mt-2 space-y-2' });
      wrapper.appendChild(sectionHeader('문제', 'reason', () => {
        reasons.push({ text: '', category: 'cognitive', selected: false, hypotheses: [] });
        renderTree();
      }));
      reasons.forEach((reason, ri) => {
        const row = makeRow(reason, 'text', helpCfg.reason.placeholder, () => {
          if (reason.selected) {
            reason.selected = false;
          } else {
            reasons.forEach((r) => r.selected = false);
            reason.selected = true;
            if (!reason.hypotheses || reason.hypotheses.length === 0) {
              reason.hypotheses = [{ text: '', status: 'pending', selected: false, lessonLearned: '' }];
            }
          }
          renderTree();
        }, null, null, reason.selected);
        row.appendChild(el('button', {
          className: 'text-red-300 hover:text-red-500 text-sm shrink-0',
          onclick: () => {
            reasons.splice(ri, 1);
            if (reasons.length === 0) reasons.push({ text: '', category: 'cognitive', selected: false, hypotheses: [] });
            renderTree();
          },
        }, '\u00D7'));
        const reasonItem = el('div', {});
        reasonItem.appendChild(row);
        if (reason.selected) {
          const hypEl = renderHypList(reason.hypotheses);
          hypEl.classList.add('mb-4');
          reasonItem.appendChild(hypEl);
        }
        addParentHighlight(reasonItem, row);
        wrapper.appendChild(reasonItem);
      });
      return wrapper;
    }

    // === Blockers ===
    const blockerSection = el('div', { className: 'space-y-2' });
    blockerSection.appendChild(sectionHeader('블록커', 'blocker', () => {
      blockers.push({ blocker: '', selected: false, reasons: [] });
      renderTree();
    }));
    blockers.forEach((blocker, i) => {
      const row = makeRow(blocker, 'blocker', helpCfg.blocker.placeholder, () => {
        if (blocker.selected) {
          blocker.selected = false;
        } else {
          blockers.forEach((b) => b.selected = false);
          blocker.selected = true;
          if (!blocker.reasons || blocker.reasons.length === 0) {
            blocker.reasons = [{ text: '', category: 'cognitive', selected: false, hypotheses: [] }];
          }
        }
        renderTree();
      }, null, null, blocker.selected);
      row.appendChild(el('button', {
        className: 'text-red-300 hover:text-red-500 text-sm shrink-0',
        onclick: () => {
          blockers.splice(i, 1);
          if (blockers.length === 0) blockers.push({ blocker: '', selected: false, reasons: [] });
          renderTree();
        },
      }, '\u00D7'));
      const blockerItem = el('div', {});
      blockerItem.appendChild(row);
      if (blocker.selected) {
        const reasonsEl = renderReasonList(blocker.reasons);
        reasonsEl.classList.add('mb-4');
        blockerItem.appendChild(reasonsEl);
      }
      addParentHighlight(blockerItem, row);
      blockerSection.appendChild(blockerItem);
    });
    treeContainer.appendChild(blockerSection);
  }

  renderTree();

  const actions = el('div', { className: 'flex items-center gap-3' },
    el('button', {
      className: 'text-sm text-gray-500 hover:text-gray-700',
      onclick: () => navigate('/dashboard'),
    }, '\u2190 돌아가기'),
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
            status: currentStatus,
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
            status: currentStatus,
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

  content.appendChild(actions);
  content.appendChild(el('div', { className: 'mt-6' },
    el('div', { className: 'flex items-center gap-1.5 mb-2' },
      el('span', { className: 'text-xs font-medium text-gray-500 uppercase tracking-wide' }, '목표'),
      helpIcon('goal', helpCfg, onHelpUpdate),
    ),
    goalInput,
    treeContainer,
  ));
}
