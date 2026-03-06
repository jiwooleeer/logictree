let state = {
  nickname: localStorage.getItem('lt_nickname') || null,
  isTeacher: localStorage.getItem('lt_isTeacher') === 'true',
};

const listeners = [];

export function getState() {
  return state;
}

export function setState(partial) {
  state = { ...state, ...partial };
  if ('nickname' in partial) {
    if (partial.nickname) localStorage.setItem('lt_nickname', partial.nickname);
    else localStorage.removeItem('lt_nickname');
  }
  if ('isTeacher' in partial) {
    localStorage.setItem('lt_isTeacher', String(state.isTeacher));
  }
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
