import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const debug = process.argv.includes('--debug');
const npmCli = process.env.npm_execpath;

if (!npmCli || !existsSync(npmCli)) {
  console.error('请在项目根目录运行 npm run dev 或 npm run dev:debug。');
  process.exit(1);
}

const services = [
  { label: 'API', script: debug ? 'dev:debug' : 'dev', workspace: '@digital-swu/api' },
  { label: 'WEB', script: 'dev', workspace: '@digital-swu/web' },
];
const children = new Set();
let stopping = false;

function prefix(stream, label, target) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) target.write(`[${label}] ${line}\n`);
  });
  stream.on('end', () => { if (pending) target.write(`[${label}] ${pending}\n`); });
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already exited */ }
    }
  }
  setTimeout(() => process.exit(exitCode), 300).unref();
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

for (const service of services) {
  const child = spawn(process.execPath, [npmCli, 'run', service.script, '-w', service.workspace], {
    cwd: root,
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  children.add(child);
  prefix(child.stdout, service.label, process.stdout);
  prefix(child.stderr, service.label, process.stderr);
  child.on('error', (error) => { console.error(`[${service.label}] 启动失败：${error.message}`); stop(1); });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(`[${service.label}] 已退出 (${signal ?? code ?? 'unknown'})，正在停止其他服务。`);
      stop(code && code !== 0 ? code : 1);
    }
  });
}

console.log(`启动 ${debug ? '调试' : '开发'}模式：Web http://127.0.0.1:5174 · API http://127.0.0.1:3000`);
if (debug) console.log('API 调试器：127.0.0.1:9229（仅本机）');
console.log('按 Ctrl+C 停止两个服务。');
