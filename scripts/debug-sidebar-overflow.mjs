import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const appDir = '/Users/joburbanop/Herd/cartera-front';
const port = 4201;
const baseUrl = `http://127.0.0.1:${port}`;

function waitForServer(url, timeoutMs = 120000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - started > timeoutMs) {
            reject(new Error(`Servidor no respondió en ${timeoutMs}ms`));
            return;
          }
          setTimeout(check, 1000);
        });
    };
    check();
  });
}

function startApp() {
  const child = spawn('npx', ['ng', 'serve', '--host', '127.0.0.1', '--port', String(port), '--configuration', 'development'], {
    cwd: appDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: 'true' },
  });

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
    process.stdout.write(data);
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
    process.stderr.write(data);
  });

  return { child, output: () => output };
}

async function measureState(page, label, state) {
  await page.evaluate((stateName) => {
    const nav = document.querySelector('nav.nav-menu');
    const sidebar = document.querySelector('aside.sidebar');
    if (!nav || !sidebar) {
      throw new Error(`No se encontró nav/sidebar para ${stateName}`);
    }

    const setState = () => {
      if (stateName === 'expanded') {
        sidebar.classList.remove('collapsed');
      } else if (stateName === 'collapsed') {
        sidebar.classList.add('collapsed');
      } else if (stateName === 'mobile') {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('mobile-open');
      }
    };

    setState();
    const directChildren = Array.from(nav.children).map((child, index) => ({
      index,
      tag: child.tagName,
      className: child.className,
      scrollWidth: child.scrollWidth,
      offsetWidth: child.offsetWidth,
      clientWidth: child.clientWidth,
      text: child.textContent?.slice(0, 80).trim() || '',
    }));

    const result = {
      state: stateName,
      nav: {
        scrollWidth: nav.scrollWidth,
        clientWidth: nav.clientWidth,
        offsetWidth: nav.offsetWidth,
        overflow: nav.scrollWidth > nav.clientWidth,
      },
      sidebar: {
        scrollWidth: sidebar.scrollWidth,
        clientWidth: sidebar.clientWidth,
        offsetWidth: sidebar.offsetWidth,
        overflow: sidebar.scrollWidth > sidebar.clientWidth,
      },
      directChildren,
      hash: window.location.hash,
    };

    window.__debugSidebar = result;
  }, state);

  return page.evaluate(() => window.__debugSidebar);
}

async function main() {
  const { child, output } = startApp();
  try {
    await waitForServer(baseUrl + '/dashboard');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'debug-token');
      localStorage.setItem('auth_roles', JSON.stringify(['administrador']));
      localStorage.setItem('auth_user_name', 'Juan Pérez');
      localStorage.setItem('auth_user_id', '1');
    });
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForSelector('aside.sidebar');

    const states = ['expanded', 'collapsed', 'mobile'];
    const measurements = [];

    for (const state of states) {
      const viewport = state === 'mobile' ? { width: 375, height: 812 } : { width: 1440, height: 900 };
      await page.setViewportSize(viewport);
      const res = await measureState(page, `state-${state}`, state);
      measurements.push({ state, ...res });
    }

    console.log('MEDICIONES_ANTES');
    console.dir(measurements, { depth: 8 });

    await browser.close();
    child.kill('SIGTERM');
  } catch (error) {
    console.error('ERROR EN MEDICION', error);
    if (child && !child.killed) child.kill('SIGTERM');
    process.exitCode = 1;
  }
}

main();
