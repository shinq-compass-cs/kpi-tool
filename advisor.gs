// ============================================================
// advisor.gs — AIマーケティングアドバイザー（GAS Web App）
//
// 【セットアップ手順】
// 1. Google Apps Script (script.google.com) で新しいプロジェクトを作成
// 2. このコードを貼り付けて保存
// 3. 「プロジェクトの設定」→「スクリプトプロパティ」に
//      CLAUDE_API_KEY = sk-ant-xxxx...  を追加
// 4. 「デプロイ」→「新しいデプロイ」→ 種類:ウェブアプリ
//      実行するユーザー：自分、アクセスできるユーザー：全員
// 5. デプロイURLをコピーして index.html の ADVISOR_GAS_URL に貼り付ける
// ============================================================

const CLAUDE_MODEL_ADVISOR = 'claude-sonnet-4-6';

function doPost(e) {
  try {
    // URLSearchParams形式 (application/x-www-form-urlencoded) で受信
    const raw = (e.parameter && e.parameter.data)
      ? e.parameter.data
      : (e.postData ? e.postData.contents : '{}');
    const data = JSON.parse(raw);

    const detailUrl = String(data.detail_url || '').trim();
    const kpi = data.kpi || {};
    if (!detailUrl) throw new Error('detail_url が未指定です');

    const pageText = fetchDetailPage(detailUrl);
    const advice   = generateAdvice(pageText, kpi);
    return jsonResp({ success: true, advice });

  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

// ─── ページ取得・テキスト抽出 ───────────────────────────────

function fetchDetailPage(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error('ページ取得失敗 HTTP ' + res.getResponseCode());
  }
  return extractText(res.getContentText('UTF-8'));
}

function extractText(html) {
  const sec = [];

  // JSON-LD 構造化データ（最も信頼性が高い）
  const ldM = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldM) {
    try {
      const ld = JSON.parse(ldM[1]);
      if (ld.name)        sec.push('【院名】' + ld.name);
      if (ld.description) sec.push('【説明文】' + ld.description.slice(0, 400));
      if (ld.address)     sec.push('【住所】' + (ld.address.addressLocality || '') + (ld.address.streetAddress || ''));
      if (ld.openingHours) {
        const oh = Array.isArray(ld.openingHours) ? ld.openingHours.join('、') : ld.openingHours;
        sec.push('【営業時間】' + oh);
      }
    } catch(e) {}
  }

  // ページタイトル
  const tM = html.match(/<title>([^<]+)<\/title>/i);
  if (tM) sec.push('【ページタイトル】' + tM[1].trim());

  // メタ説明
  const mM = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{10,}?)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']{10,}?)["'][^>]+name=["']description["']/i);
  if (mM) sec.push('【メタ説明】' + mM[1].trim().slice(0, 300));

  // 見出し h1〜h3
  const hAll = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)];
  const heads = hAll
    .map(m => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(t => t.length > 2 && t.length < 150);
  if (heads.length) sec.push('【見出し一覧】\n' + heads.slice(0, 15).join('\n'));

  // 院内・メニュー画像の概算枚数
  const imgCnt = (html.match(/<img[^>]+src=["'][^"']*(?:salon|menu|staff|photo|image)[^"']*["']/gi) || []).length;
  sec.push('【掲載画像数（概算）】' + imgCnt + '枚');

  // 料金情報
  const prices = [...new Set([...html.matchAll(/[\d,]{3,}円/g)].map(m => m[0]))].slice(0, 8);
  if (prices.length) sec.push('【料金情報】' + prices.join('、'));

  // 口コミ評価・件数
  const rvM = html.match(/(\d\.\d+)[^\d]{0,10}(\d{2,})\s*件/);
  if (rvM) sec.push('【口コミ】評価 ' + rvM[1] + '点 / ' + rvM[2] + '件');

  return sec.join('\n\n');
}

// ─── Claude API 呼び出し ───────────────────────────────────

function generateAdvice(pageText, kpi) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('スクリプトプロパティ CLAUDE_API_KEY が未設定です');

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    payload: JSON.stringify({
      model: CLAUDE_MODEL_ADVISOR,
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(pageText, kpi) }]
    }),
    muteHttpExceptions: true
  });

  const json = JSON.parse(res.getContentText());
  if (!json.content || !json.content[0]) {
    throw new Error('Claude API エラー: ' + res.getContentText().slice(0, 200));
  }
  return json.content[0].text;
}

function buildPrompt(pageText, kpi) {
  const kpiLines = [
    '院名：'                  + f(kpi.name),
    'エリア：'                + f(kpi.area),
    'プラン：'                + f(kpi.compass_plan),
    '検索優先ポイント：'      + f(kpi.search_point) + 'pt',
    'エリア内順位：'          + f(kpi.area_rank) + '位',
    '',
    '■ ニーズ1（検索で見つけてもらう）',
    '  アクセス数：'          + f(kpi.access)          + '（目標200）',
    '  店舗PR情報登録：'      + fl(kpi.store_pr),
    '  予約公開：'            + fl(kpi.reserve_public),
    '  予約GMB設置：'         + fl(kpi.reserve_gmb),
    '  予約バナー設置：'      + fl(kpi.reserve_banner),
    '  コンパス相互リンク：'  + fl(kpi.compass_link),
    '',
    '■ ニーズ2（予約ボタンを押してもらう）',
    '  クリック数：'          + f(kpi.click)            + '（目標20）',
    '  クリック率：'          + f(kpi.click_rate)       + '%（目標10%）',
    '  口コミ件数：'          + f(kpi.review)           + '件（目標5件）',
    '  口コミ返信：'          + f(kpi.review_reply)     + '件（目標5件）',
    '  PickUp口コミ：'        + fl(kpi.pickup_review),
    '  口コミパーツ設置：'    + fl(kpi.review_parts),
    '  メニュー3件以上：'     + fl(kpi.menu3),
    '',
    '■ ニーズ3（実際に予約してもらう）',
    '  予約数：'              + f(kpi.net_reserve)      + '件（目標2件）',
    '  ネット予約率：'        + f(kpi.net_reserve_rate) + '%（目標10%）',
    '  メニュー連携：'        + fl(kpi.menu_link),
    '  ゲスト予約利用：'      + fl(kpi.guest_reserve),
    '  予約受付締切時間：'    + f(kpi.deadline)         + '分前',
  ].join('\n');

  return `あなたは鍼灸院・整骨院専門のWebマーケティングコンサルタントです。
以下の「院詳細ページ情報」と「KPIデータ」を分析し、担当コンサルタントが集客を最大化するために行うべき具体的なアドバイスを日本語で提供してください。

【院詳細ページ情報（shinq-compass.jpより取得）】
${pageText}

【現在のKPIデータ】
${kpiLines}

## 出力形式（マークダウン記号は使わない。### の見出しと ・ の箇条書きのみ使用）

### 1. ページの訴求力レビュー
写真点数・キャッチコピー・説明文・メニュー情報の現状評価と改善点

### 2. KPI未達の改善アクション
未達KPIに対する具体的な行動提案（優先度順）

### 3. このサロンの強み・差別化ポイント
ページ内容から読み取れる強みと、それを活かした集客戦略

### 4. 優先度の高い施策TOP3
今すぐ着手すべき施策を1〜3位で提示（理由も含めて）

院長への説明に使えるレベルの具体性で、各項目は箇条書き（・）で記述してください。`;
}

// ─── ユーティリティ ───────────────────────────────────────

function f(v)  { return (v !== null && v !== undefined) ? String(v) : '-'; }

function fl(v) {
  if (v === null || v === undefined) return '未設定';
  return (v == 1 || v === '1' || v === '公開') ? '達成✓' : '未達✗';
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
