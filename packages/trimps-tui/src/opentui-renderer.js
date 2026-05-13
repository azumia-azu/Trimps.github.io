const React = require('react');
const { App } = require('./dashboard');

async function createOpenTuiRenderer() {
  const { createCliRenderer } = await import('@opentui/core');
  const { createRoot } = await import('@opentui/react');

  const renderer = await createCliRenderer({ exitOnCtrlC: true, targetFps: 10 });
  const root = createRoot(renderer);

  return {
    async update(snapshot) {
      root.render(React.createElement(App, { snapshot }));
    },
    async close() {
      if (root && typeof root.unmount === 'function') root.unmount();
      if (renderer && typeof renderer.destroy === 'function') renderer.destroy();
      else if (renderer && typeof renderer.stop === 'function') renderer.stop();
    },
  };
}

module.exports = { createOpenTuiRenderer };
