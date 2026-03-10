// ============================================================
// advisor.gs — Claude API プロキシ（GAS Web App）
//
// 【役割】ページ取得（CORS回避）＋ Claude API 中継のみ
// 【変更不要な項目】プロンプト内容・max_tokens・パース処理
//   → これらはすべて index.html 側で管理
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

var CLAUDE_MODEL_ADVISOR = 'claude-sonnet-4-6';

function doPost(e) {
  try {
    var raw = (e.parameter && e.parameter.data)
      ? e.parameter.data
      : (e.postData ? e.postData.contents : '{}');
    var data = JSON.parse(raw);

    var detailUrl     = String(data.detail_url     || '').trim();
    var promptTpl     = String(data.prompt_template || '').trim();
    var maxTokens     = parseInt(data.max_tokens, 10) || 4000;

    if (!detailUrl)  throw new Error('detail_url が未指定です');
    if (!promptTpl)  throw new Error('prompt_template が未指定です');

    // ページテキストを取得して {{PAGE_TEXT}} を置換
    var pageText = fetchDetailPage(detailUrl);
    var prompt   = promptTpl.replace('{{PAGE_TEXT}}', pageText);

    // Claude API 呼び出し
    var result = callClaude(prompt, maxTokens);
    return jsonResp({ success: true, advice: result.text, tokens: result.usage });

  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

// ─── ページ取得・テキスト抽出 ───────────────────────────────

function fetchDetailPage(url) {
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error('ページ取得失敗 HTTP ' + res.getResponseCode());
  }
  return extractText(res.getContentText('UTF-8'));
}

function extractText(html) {
  var sec = [];

  // JSON-LD 構造化データ
  var ldM = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldM) {
    try {
      var ld = JSON.parse(ldM[1]);
      if (ld.name)        sec.push('【院名】' + ld.name);
      if (ld.description) sec.push('【説明文】' + ld.description.slice(0, 400));
      if (ld.address)     sec.push('【住所】' + (ld.address.addressLocality || '') + (ld.address.streetAddress || ''));
      if (ld.openingHours) {
        var oh = Array.isArray(ld.openingHours) ? ld.openingHours.join('、') : ld.openingHours;
        sec.push('【営業時間】' + oh);
      }
    } catch(e) {}
  }

  // ページタイトル
  var tM = html.match(/<title>([^<]+)<\/title>/i);
  if (tM) sec.push('【ページタイトル】' + tM[1].trim());

  // メタ説明
  var mM = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{10,}?)["']/i)
         || html.match(/<meta[^>]+content=["']([^"']{10,}?)["'][^>]+name=["']description["']/i);
  if (mM) sec.push('【メタ説明】' + mM[1].trim().slice(0, 300));

  // 見出し h1〜h3
  var headRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  var heads = [];
  var hm;
  while ((hm = headRe.exec(html)) !== null && heads.length < 15) {
    var ht = hm[1].replace(/<[^>]+>/g, '').trim();
    if (ht.length > 2 && ht.length < 150) heads.push(ht);
  }
  if (heads.length) sec.push('【見出し一覧】\n' + heads.join('\n'));

  // 院内・メニュー画像の概算枚数
  var imgCnt = (html.match(/<img[^>]+src=["'][^"']*(?:salon|menu|staff|photo|image)[^"']*["']/gi) || []).length;
  sec.push('【掲載画像数（概算）】' + imgCnt + '枚');

  // 料金情報
  var priceRe = /[\d,]{3,}円/g;
  var priceMap = {};
  var priceList = [];
  var pm;
  while ((pm = priceRe.exec(html)) !== null) {
    if (!priceMap[pm[0]] && priceList.length < 8) {
      priceMap[pm[0]] = true;
      priceList.push(pm[0]);
    }
  }
  if (priceList.length) sec.push('【料金情報】' + priceList.join('、'));

  // 口コミ評価・件数
  var rvM = html.match(/(\d\.\d+)[^\d]{0,10}(\d{2,})\s*件/);
  if (rvM) sec.push('【口コミ】評価 ' + rvM[1] + '点 / ' + rvM[2] + '件');

  return sec.join('\n\n');
}

// ─── Claude API 呼び出し ───────────────────────────────────

function callClaude(prompt, maxTokens) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('スクリプトプロパティ CLAUDE_API_KEY が未設定です');

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      model: CLAUDE_MODEL_ADVISOR,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  var json = JSON.parse(res.getContentText());
  if (!json.content || !json.content[0]) {
    throw new Error('Claude API エラー: ' + res.getContentText().slice(0, 200));
  }
  return { text: json.content[0].text, usage: json.usage || {} };
}

// ─── ユーティリティ ───────────────────────────────────────

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
