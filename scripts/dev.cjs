// Wrapper to remove ELECTRON_RUN_AS_NODE before launching electron-vite dev.
// If this env var is set (e.g. from VS Code or a previous shell command), Electron
// runs in Node.js-only mode and require('electron').app is undefined, crashing the app.
const { spawnSync } = require('child_process')
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const result = spawnSync('npx', ['electron-vite', 'dev'], {
  stdio: 'inherit',
  env,
  shell: true
})
process.exit(result.status || 0)
