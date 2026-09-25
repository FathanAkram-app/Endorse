import './sites-env.mjs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const cli = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url);
// Wrangler resolves env files relative to its built config; use an absolute
// path so dev and the built preview read the same ignored local secret file.
const child = spawn(process.execPath, [fileURLToPath(cli), 'dev',
  '--config', 'dist/server/wrangler.json',
  '--env-file', fileURLToPath(new URL('../.dev.vars', import.meta.url)),
  '--local', '--persist-to', '.wrangler/state', '--ip', '127.0.0.1',
  '--inspector-port', '0', ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
