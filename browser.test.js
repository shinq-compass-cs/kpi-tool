// ============================================================
// browser.test.js — kpi-tool Playwright ブラウザテスト
// 実行: node browser.test.js
// 対象: https://shinq-compass-cs.github.io/kpi-tool/
//       https://shinq-compass-cs.github.io/kpi-tool/delegate.html
// ============================================================

const { chromium, webkit } = require('../repeat-rate/node_modules/playwright');

const BASE_URL      = 'https://shinq-compass-cs.github.io/kpi-tool/';
const DELEGATE_URL  = 'https://shinq-compass-cs.github.io/kpi-tool/delegate.html';
const TEST_SALON_ID = '38459';  // 無料体験タブに存在するサロン
const TEST_EMAIL    = 'test';   // 内部ショートカット（メール照合スキップ）

// ─── ユーティリティ ─────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

async function run(id, label, fn) {
  try {
    await fn();
    console.log(`  ✓ [${id}] ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ [${id}] ${label}`);
    console.error(`      → ${e.message.split('\n')[0]}`);
    failed++;
    failures.push({ id, label, msg: e.message.split('\n')[0] });
  }
}

// ログイン操作（共通）
async function doLogin(page, salonId = TEST_SALON_ID, email = TEST_EMAIL) {
  // loading-overlayが残っていれば強制非表示
  await page.evaluate(() => {
    const ov = document.getElementById('loading');
    if (ov) ov.style.display = 'none';
  }).catch(() => {});
  // ログイン画面が表示されるまで待機
  await page.waitForSelector('.login-btn', { state: 'visible', timeout: 10000 });
  await page.fill('#salon-id-input', salonId);
  await page.fill('#email-input', email);
  // force:true でオーバーレイに関わらずクリック
  await page.click('.login-btn', { force: true });
  // ダッシュボードが表示されるまで待機（最大15秒）
  await page.waitForSelector('#dashboard', { state: 'visible', timeout: 15000 });
}

// ─── テストスイート ──────────────────────────────────────────

async function runSuite(browserName, browserType) {
  const viewport = browserName.includes('iPhone')
    ? { width: 390, height: 844 }
    : { width: 390, height: 800 };

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  ${browserName}  (${viewport.width}×${viewport.height})`);
  console.log(`${'═'.repeat(55)}`);

  const browser = await browserType.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport });
  const page    = await ctx.newPage();

  // ─── Layer 2: ログイン画面 状態遷移 ─────────────────────

  console.log('\n▼ ログイン画面');

  await run('ST-LOGIN-01', '未入力でログイン → エラー表示', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.click('.login-btn');
    const txt = await page.$eval('#login-error', el => el.textContent.trim());
    if (!txt) throw new Error('エラーメッセージが空');
    if (!txt.includes('入力')) throw new Error(`エラー文言が想定外: ${txt}`);
  });

  await run('ST-LOGIN-02', 'サロンIDのみ未入力でログイン → エラー表示', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#email-input', 'test@example.com');
    await page.click('.login-btn');
    const txt = await page.$eval('#login-error', el => el.textContent.trim());
    if (!txt) throw new Error('エラーメッセージが空');
  });

  await run('ST-LOGIN-03', '存在しないサロンID → エラー表示', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#salon-id-input', '99999999');
    await page.fill('#email-input', TEST_EMAIL);
    await page.click('.login-btn');
    await page.waitForTimeout(18000); // GAS応答待ち（長め）
    const txt = await page.$eval('#login-error', el => el.textContent.trim());
    if (!txt.includes('見つかりません')) throw new Error(`エラー文言が想定外: "${txt}"`);
  });

  await run('ST-LOGIN-04', '正常ログイン → ダッシュボード表示', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await doLogin(page);
    if (!await page.isVisible('#dashboard')) throw new Error('ダッシュボードが表示されていない');
    if (!await page.isHidden('#login-screen'))  throw new Error('ログイン画面が残っている');
  });

  await run('ST-LOGIN-05', 'メールアドレス入力欄がパスワードマスク(type=password)', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const t = await page.$eval('#email-input', el => el.type);
    if (t !== 'password') throw new Error(`type="${t}"（password期待）`);
  });

  await run('ST-LOGIN-06', 'テスト(内部)ログイン → レポーティングボタン表示', async () => {
    // ST-LOGIN-05でページリセットされているため再ログイン
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await doLogin(page);  // testメールは内部ショートカット
    const display = await page.$eval('#report-trigger-row', el => el.style.display);
    if (display === 'none') throw new Error('内部ログイン時にレポーティングボタンが非表示');
    // このままST-DASH-*テストへ続く（ログイン済み状態を維持）
  });

  // ─── Layer 2: ダッシュボード表示確認 ────────────────────

  console.log('\n▼ ダッシュボード表示');

  // ログイン済み状態で以下のテストを続行
  await run('ST-DASH-01', '検索優先ポイントが表示される', async () => {
    // #point-badge が表示され、#search-point に数値が入っているか
    const badgeVisible = await page.isVisible('#point-badge');
    if (!badgeVisible) throw new Error('#point-badge が非表示');
    const pt = await page.$eval('#search-point', el => el.textContent.trim());
    if (!pt || pt === '―' || pt === '') throw new Error(`検索優先ポイントが空: "${pt}"`);
  });

  await run('ST-DASH-02', 'エリア内順位が表示される', async () => {
    const rank = await page.$eval('#area-rank', el => el.textContent.trim());
    if (!rank || rank === '' || rank === '-') throw new Error(`エリア内順位: "${rank}"`);
  });

  await run('ST-DASH-03', 'レポート：月末着地見込みが表示される（アクセス・クリック）', async () => {
    // レポートモーダルを開く（内部ログイン済みのため表示可能）
    await page.click('#report-trigger-row button');
    await page.waitForSelector('#report-modal', { state: 'visible', timeout: 8000 });
    // モーダル内のコンテンツ生成を待つ
    await page.waitForSelector('.rm-kc-proj', { timeout: 30000 }).catch(() => {});
    const cnt = await page.$$eval('.rm-kc-proj', els => els.length);
    // モーダルを閉じる
    await page.keyboard.press('Escape').catch(() => {});
    const closeBtn = page.locator('[onclick="closeReport()"], .rm-close-btn').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    if (cnt < 2) throw new Error(`月末着地見込み要素数: ${cnt}（2以上期待）`);
  });

  await run('ST-DASH-04', 'レポート：KPI課題グループ3件（アクセス/クリック/予約）が表示される', async () => {
    // モーダルを再度開く
    await page.click('#report-trigger-row button');
    await page.waitForSelector('#report-modal', { state: 'visible', timeout: 8000 });
    await page.waitForSelector('.rm-kpi-group-hd', { timeout: 30000 }).catch(() => {});
    const groups = await page.$$eval('.rm-kpi-group-hd', els => els.map(el => el.textContent));
    const closeBtn = page.locator('[onclick="closeReport()"], .rm-close-btn').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    if (groups.length < 3) throw new Error(`グループ数: ${groups.length}`);
    const joined = groups.join('');
    ['アクセス', 'クリック', '予約'].forEach(kw => {
      if (!joined.includes(kw)) throw new Error(`「${kw}」グループが見当たらない`);
    });
  });

  await run('ST-DASH-05', 'エリア実施取り組み状況の棒グラフが表示される', async () => {
    // #area-heatmap が表示されているか確認
    const heatmapVisible = await page.isVisible('#area-heatmap');
    if (!heatmapVisible) throw new Error('#area-heatmap が非表示');
    const bars = await page.$$('.hm-bar');
    if (bars.length === 0) throw new Error('棒グラフ要素（.hm-bar）が見当たらない');
  });

  await run('ST-DASH-06', '「自院達成」「自院未達」ラベルが表示される', async () => {
    const labels = await page.$$eval('.hm-self', els => els.map(el => el.textContent));
    if (labels.length === 0) throw new Error('自院ラベルが見当たらない');
    const joined = labels.join('');
    if (!joined.includes('自院達成') && !joined.includes('自院未達'))
      throw new Error(`ラベル内容: ${joined.slice(0, 60)}`);
  });

  // ─── Layer 2: 代行設置モーダル（index.html内） ──────────

  console.log('\n▼ 代行設置モーダル（index.html内）');

  await run('ST-DEL-01', '「代行設置を依頼する」クリック → モーダル表示', async () => {
    // ダッシュボード上で代行設置ボタンを探す
    const btn = page.locator('button:has-text("代行設置"), [onclick*="openDelegate"], .delegate-open-btn').first();
    if (!await btn.isVisible()) throw new Error('代行設置を開くボタンが表示されていない');
    await btn.click();
    await page.waitForSelector('#delegate-overlay', { state: 'visible', timeout: 5000 });
  });

  await run('ST-DEL-03', 'GBPチェックON → GBP入力欄が展開される', async () => {
    const chk = page.locator('#delegate-overlay #chk-gbp');
    if (!await chk.isVisible()) throw new Error('#chk-gbp が見当たらない');
    if (!await chk.isChecked()) await chk.click();
    await page.waitForTimeout(400);
    const sec = page.locator('#delegate-overlay #gbp-field-section');
    if (!await sec.isVisible()) throw new Error('GBP入力欄が展開されない');
  });

  await run('ST-DEL-04', 'GBPチェックOFF → GBP入力欄が非表示', async () => {
    const chk = page.locator('#delegate-overlay #chk-gbp');
    if (await chk.isChecked()) await chk.click();
    await page.waitForTimeout(400);
    const sec = page.locator('#delegate-overlay #gbp-field-section');
    if (await sec.isVisible()) throw new Error('GBP入力欄がOFF時も表示されている');
  });

  await run('ST-DEL-05', 'GBP欄に管理権限リクエスト承認案内が表示される', async () => {
    // チェックONにして確認
    const chk = page.locator('#delegate-overlay #chk-gbp');
    if (!await chk.isChecked()) await chk.click();
    await page.waitForTimeout(300);
    const body = await page.content();
    if (!body.includes('管理権限') && !body.includes('承認'))
      throw new Error('管理権限リクエスト承認案内が見当たらない');
  });

  // ─── Layer 3: E2E delegate.html 直接アクセス ────────────

  console.log('\n▼ delegate.html');

  await run('SA-03-a', 'delegate.html にアクセスできる', async () => {
    await page.goto(DELEGATE_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    if (!title) throw new Error('ページタイトルが空');
  });

  await run('SA-03-b', 'GBPチェックON → 設定の流れが展開する', async () => {
    const chk = page.locator('#chk-gbp');
    if (!await chk.isVisible()) throw new Error('#chk-gbp が表示されていない');
    if (!await chk.isChecked()) await chk.click();
    await page.waitForTimeout(400);
    const sec = page.locator('#gbp-section');
    if (!await sec.isVisible()) throw new Error('GBP設定の流れが展開しない');
  });

  await run('SA-03-c', 'delegate.html GBP欄に承認案内が表示される', async () => {
    const body = await page.content();
    if (!body.includes('管理権限') && !body.includes('承認'))
      throw new Error('承認案内が見当たらない');
  });

  await run('SA-03-d', 'GBPチェックOFF → 設定の流れが非表示', async () => {
    const chk = page.locator('#chk-gbp');
    if (await chk.isChecked()) await chk.click();
    await page.waitForTimeout(400);
    const sec = page.locator('#gbp-section');
    if (await sec.isVisible()) throw new Error('設定の流れがOFF時も表示されている');
  });

  // ─── ブラウザ表示テスト ──────────────────────────────────

  console.log('\n▼ ブラウザ表示');

  await run('B-01', '横スクロールが発生しない（index.html ログイン画面）', async () => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
    );
    if (overflow) {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      throw new Error(`横スクロール発生: scrollWidth=${sw}, innerWidth=${viewport.width}`);
    }
  });

  await run('B-02', 'inputのfont-sizeが16px以上（iOS zoom防止）', async () => {
    const violations = await page.evaluate(() => {
      return [...document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"])')]
        .filter(el => el.offsetParent !== null)
        .map(el => ({ id: el.id || el.placeholder || '(no id)', fs: parseFloat(getComputedStyle(el).fontSize) }))
        .filter(x => x.fs < 16);
    });
    if (violations.length > 0)
      throw new Error(`font-size<16px: ${violations.map(v => `${v.id}(${v.fs}px)`).join(', ')}`);
  });

  await run('B-03', '横スクロールが発生しない（delegate.html）', async () => {
    await page.goto(DELEGATE_URL, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
    );
    if (overflow) {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      throw new Error(`横スクロール発生: scrollWidth=${sw}`);
    }
  });

  await browser.close();
}

// ─── メイン ─────────────────────────────────────────────────

(async () => {
  console.log('kpi-tool Playwrightテスト開始');
  console.log(`対象: ${BASE_URL}`);
  console.log(`サロンID: ${TEST_SALON_ID} / email: ${TEST_EMAIL}`);

  try {
    await runSuite('Android Chrome (390×800)', chromium);
    await runSuite('iPhone Safari (390×844)', webkit);
  } catch (e) {
    console.error('\n予期しないエラー:', e.message);
    process.exit(2);
  }

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  結果: ${passed} 件PASS / ${failed} 件FAIL`);
  if (failures.length > 0) {
    console.log('\n  ── FAILの一覧 ──');
    failures.forEach(f => console.log(`  ✗ [${f.id}] ${f.label}\n      ${f.msg}`));
  }
  console.log('═'.repeat(55));
  process.exit(failed > 0 ? 2 : 0);
})();
