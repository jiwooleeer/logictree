const routes = [];

export function addRoute(pattern, handler) {
  const paramNames = [];
  const regexStr = pattern.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler });
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function start() {
  const handle = () => {
    const hash = window.location.hash.slice(1) || '/';
    for (const route of routes) {
      const match = hash.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        route.handler(params);
        return;
      }
    }
    // fallback to dashboard
    navigate('/');
  };
  window.addEventListener('hashchange', handle);
  handle();
}
