import { el } from '../utils/dom.js';
import { STATUSES, STATUS_COLORS } from '../utils/constants.js';

export function renderBlockerRow(blocker, index, { onUpdate, onRemove, onComment, readonly = false, commentCounts = {}, commentLatestAt = {}, lastSeenAt = 0, isSelected }) {
  function commentIcon() {
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

  function commentBtn(targetSuffix) {
    let count = commentCounts[targetSuffix] || 0;
    const latest = commentLatestAt[targetSuffix] || 0;
    const isNew = latest > lastSeenAt && count > 0;
    const countSpan = el('span', { className: 'text-xs' }, count > 0 ? String(count) : '');
    const dot = el('span', { className: `w-2 h-2 bg-red-500 rounded-full ${isNew ? '' : 'hidden'}` });
    const btn = el('button', {
      className: `relative inline-flex items-center gap-0.5 rounded-md p-1 shrink-0 transition-colors ${count > 0 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`,
      title: '댓글',
      onclick: (e) => {
        e.stopPropagation();
        dot.classList.add('hidden');
        if (onComment) onComment(targetSuffix, e.currentTarget, () => {
          count++;
          countSpan.textContent = String(count);
          btn.classList.remove('text-gray-300');
          btn.classList.add('text-gray-600');
        });
      },
    },
      commentIcon(),
      countSpan,
      dot,
    );
    return btn;
  }

  // Reasons list (each reason contains its own hypotheses)
  const reasonsList = el('div', { className: 'space-y-4' });

  function renderReasons() {
    reasonsList.innerHTML = '';
    (blocker.reasons || []).forEach((reason, ri) => {
      if (readonly && !reason.text && !(reason.hypotheses || []).some((h) => h.text)) return;

      // Hypotheses for this reason
      const hypList = el('div', { className: 'space-y-3' });

      function makeChips(hyp, hi) {
        const currentStatus = hyp.status || 'pending';
        const chips = el('div', { className: 'flex gap-2 mt-2' });
        for (const [value, label] of Object.entries(STATUSES)) {
          const isActive = value === currentStatus;
          const colorClass = isActive ? STATUS_COLORS[value] : 'bg-gray-50 text-gray-400 border border-gray-200';
          const chip = el('button', {
            className: `text-sm px-4 py-1.5 rounded-full transition-colors ${colorClass} ${readonly ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`,
            onclick: () => {
              if (readonly) return;
              reason.hypotheses[hi].status = value;
              onUpdate();
              renderHypotheses();
            },
          }, label);
          chips.appendChild(chip);
        }
        return chips;
      }

      function renderHypotheses() {
        hypList.innerHTML = '';
        (reason.hypotheses || []).forEach((hyp, hi) => {
          if (readonly && !hyp.text && !hyp.lessonLearned) return;

          const showLesson = hyp.status === 'success' || hyp.status === 'fail';

          const hypRow = el('div', { className: 'ml-4 border-l-2 border-gray-100 pl-3' },
            ...(readonly ? [el('span', { className: 'text-xs text-gray-400' }, '가설')] : []),
            el('div', { className: 'flex items-center gap-2' },
              readonly
                ? el('span', { className: 'flex-1 text-gray-700' }, hyp.text || '(미작성)')
                : el('input', {
                    type: 'text',
                    value: hyp.text || '',
                    className: 'flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400',
                    placeholder: '문제를 해결할 수 있는 방법과 그 방법을 달성하면 어떻게 되는지 입력하세요',
                    oninput: (e) => {
                      reason.hypotheses[hi].text = e.target.value;
                      onUpdate();
                    },
                  }),
              commentBtn(`_reason_${ri}_hyp_${hi}`),
              ...(readonly ? [] : [
                el('button', {
                  className: 'text-red-300 hover:text-red-500 text-sm',
                  onclick: () => {
                    reason.hypotheses.splice(hi, 1);
                    onUpdate();
                    renderHypotheses();
                  },
                }, '×'),
              ]),
            ),
            makeChips(hyp, hi),
            // Lesson learned (only when success or fail)
            ...(showLesson
              ? [readonly
                  ? (hyp.lessonLearned
                      ? el('div', { className: 'flex items-center gap-2 mt-2' },
                          el('p', { className: 'flex-1 text-gray-700' }, `레슨런: ${hyp.lessonLearned}`),
                          commentBtn(`_reason_${ri}_hyp_${hi}_lesson`),
                        )
                      : el('span', {}))
                  : el('textarea', {
                      className: 'w-full border border-gray-200 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none',
                      rows: '4',
                      placeholder: '새롭게 알게 된 사실을 기록하세요.',
                      value: hyp.lessonLearned || '',
                      oninput: (e) => {
                        reason.hypotheses[hi].lessonLearned = e.target.value;
                        onUpdate();
                      },
                    })]
              : []),
          );
          hypList.appendChild(hypRow);
        });

        if (!readonly) {
          hypList.appendChild(
            el('button', {
              className: 'ml-4 text-xs text-gray-400 hover:text-gray-600',
              onclick: () => {
                reason.hypotheses = reason.hypotheses || [];
                reason.hypotheses.push({ text: '', status: 'pending', lessonLearned: '' });
                onUpdate();
                renderHypotheses();
              },
            }, '+ 가설 추가')
          );
        }
      }

      renderHypotheses();

      const reasonRow = el('div', { className: 'bg-gray-50/50 rounded-lg p-3 space-y-3' },
        el('div', { className: 'flex items-center gap-2' },
          readonly
            ? el('span', { className: 'flex-1 text-gray-700' }, reason.text || '(미작성)')
            : el('input', {
                type: 'text',
                value: reason.text || '',
                className: 'flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400',
                placeholder: '그러한 현상이 발생한 이유를 입력하세요',
                oninput: (e) => {
                  blocker.reasons[ri].text = e.target.value;
                  onUpdate();
                },
              }),
          commentBtn(`_reason_${ri}`),
          ...(readonly ? [] : [
            el('button', {
              className: 'text-red-300 hover:text-red-500 text-sm',
              onclick: () => {
                blocker.reasons.splice(ri, 1);
                onUpdate();
                renderReasons();
              },
            }, '×'),
          ]),
        ),
        hypList,
      );

      reasonsList.appendChild(reasonRow);
    });
  }

  renderReasons();

  const container = el('div', { className: 'bg-white border border-gray-200 rounded-xl p-5' },
    // Header
    el('div', { className: 'flex items-center justify-between mb-4' },
      el('span', { className: 'text-xs text-gray-400' }, `블록커 ${index + 1}`),
      ...(readonly ? [] : [
        el('button', {
          className: 'text-xs text-red-400 hover:text-red-600',
          onclick: onRemove,
        }, '삭제'),
      ]),
    ),

    // Blocker text
    readonly
      ? el('div', { className: 'flex items-center gap-2 mb-4' },
          el('p', { className: 'flex-1 text-gray-900' }, blocker.blocker || '(미작성)'),
          commentBtn('_blocker'),
        )
      : el('input', {
          type: 'text',
          value: blocker.blocker || '',
          className: 'w-full border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-gray-400',
          placeholder: '목표를 달성하는 데 나를 가로막는 것을 입력하세요',
          oninput: (e) => {
            blocker.blocker = e.target.value;
            onUpdate();
          },
        }),

    // Reasons section (with nested hypotheses)
    el('div', {},
      el('div', { className: 'flex items-center justify-between mb-2' },
        el('span', { className: 'text-xs text-gray-500 uppercase tracking-wide' }, '문제'),
        ...(readonly ? [] : [
          el('button', {
            className: 'text-xs text-gray-400 hover:text-gray-600',
            onclick: () => {
              blocker.reasons = blocker.reasons || [];
              blocker.reasons.push({ text: '', category: 'cognitive', hypotheses: [{ text: '', status: 'pending', lessonLearned: '' }] });
              onUpdate();
              renderReasons();
            },
          }, '+ 추가'),
        ]),
      ),
      reasonsList,
    ),
  );

  return container;
}
