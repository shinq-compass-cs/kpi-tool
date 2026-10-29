// ============================================================
// advisor.gs — AI分析（GAS Web App「KPI_reporting」）
//
// 【役割】
// - ページから受け取るのは「サロンID」と「メールアドレス（社内は合言葉）」だけ
// - ログイン用GAS（kpi-data）で本人確認し、確認できたサロンの数字から
//   GASの中でAIへの指示文を組み立てる（ページから指示文やURLは受け取らない）
// - 読み込むページは、しんきゅうコンパスの院ページに限る
// - 利用回数に上限を設け、Claude の利用料金が際限なく増えないようにする
//
// 【設定】
// - スクリプトプロパティ CLAUDE_API_KEY に Claude の鍵を入れる（コードには書かない）
// - 更新は clasp push のあと gas-deploy.js で既存デプロイを新しい版に差し替える
//   （clasp deploy は公開範囲が戻るため使わない）
// ============================================================

var CLAUDE_MODEL_ADVISOR = 'claude-sonnet-4-6';
var MAX_TOKENS = 4000;

// ログイン用GAS（kpi-data）の公開URL。本人確認とサロンの数字の取得に使う
var KPI_DATA_URL = 'https://script.google.com/macros/s/AKfycbyNn7L5p1nf4PwnZZpdyV-k9aD3YNHsL5v5QDGoILq_YWsnJ4DiYjiGuN4Okq5u4PJevw/exec';

// 読み込みを許すページ（しんきゅうコンパスの院ページ）
var PAGE_URL_PATTERN = /^https:\/\/(www\.)?shinq-compass\.jp\//;
var DEFAULT_PAGE_URL = 'https://www.shinq-compass.jp/salon/detail/';

// 1日あたりの利用回数の上限（日本時間で日付が変わると戻る）
var DAILY_PER_SALON = 5;
var DAILY_TOTAL     = 300;
var USAGE_PROP      = 'ADVISOR_USAGE';

// ページに出すエラー文
var MSG = {
  missing:  'ログイン情報を確認できませんでした。もう一度ログインしてください。',
  denied:   'ログイン情報を確認できませんでした。もう一度ログインしてください。',
  locked:   '入力の誤りが続いたため、一時的に利用できません。15分ほどおいて再度お試しください。',
  salon:    '本日のAI分析の上限（1院あたり' + DAILY_PER_SALON + '回）に達しました。明日以降に再度お試しください。',
  total:    '本日のAI分析の上限に達しました。明日以降に再度お試しください。',
  server:   'AI分析に失敗しました。時間をおいて再度お試しください。'
};

function doPost(e) {
  try {
    var raw = (e.parameter && e.parameter.data)
      ? e.parameter.data
      : (e.postData ? e.postData.contents : '{}');
    var req = JSON.parse(raw);
    var salonId = String(req.salon_id || '').trim();
    var email   = String(req.email || '').trim().toLowerCase();
    if (!salonId || !email) return fail('missing');

    // 1. 本人確認（ログインと同じ照合。失敗回数もログインと共通で数える）
    var login = verifyLogin(salonId, email);
    if (!login.ok) {
      return fail(login.error === 'locked' ? 'locked'
                : (login.error === 'not_found' || login.error === 'email_mismatch' || login.error === 'missing') ? 'denied'
                : 'server');
    }

    // 2. 回数の上限（本人確認のあとで数えるので、他院の回数を勝手に使われない）
    var limit = takeQuota(salonId);
    if (limit) return fail(limit);

    // 3. ページ読み込みと指示文の組み立て（すべてGASの中で行う）
    var d = login.found || {};
    var pageText = fetchDetailPage(pageUrlFor(d, salonId));
    var prompt = buildAdvisorPrompt(d).replace('{{PAGE_TEXT}}', function () { return pageText; });

    // 4. Claude 呼び出し
    var result = callClaude(prompt, MAX_TOKENS);
    return jsonResp({ success: true, advice: result.text, tokens: result.usage });

  } catch (err) {
    console.error(err);
    return fail('server');
  }
}

function fail(code) {
  return jsonResp({ success: false, error: MSG[code] || MSG.server, code: code });
}

// ─── 本人確認（kpi-data に問い合わせる） ─────────────────────

function verifyLogin(salonId, email) {
  var res = UrlFetchApp.fetch(KPI_DATA_URL, {
    method: 'post',
    payload: { data: JSON.stringify({ salon_id: salonId, email: email }) },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('kpi-data HTTP ' + res.getResponseCode());
  }
  return JSON.parse(res.getContentText());
}

// ─── 利用回数の上限 ─────────────────────────────────────────
// 上限内なら1回分を数えて null を返す。超えていれば 'salon' か 'total' を返す

function takeQuota(salonId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    var usage = null;
    try { usage = JSON.parse(props.getProperty(USAGE_PROP) || 'null'); } catch (e) { usage = null; }
    if (!usage || usage.date !== today) usage = { date: today, total: 0, salons: {} };

    var used = usage.salons[salonId] || 0;
    if (usage.total >= DAILY_TOTAL) return 'total';
    if (used >= DAILY_PER_SALON) return 'salon';

    usage.total += 1;
    usage.salons[salonId] = used + 1;
    props.setProperty(USAGE_PROP, JSON.stringify(usage));
    return null;
  } finally {
    lock.releaseLock();
  }
}

// ─── ページ取得・テキスト抽出 ───────────────────────────────

// シートに院ページのURLがあれば使い、なければサロンIDから作る（コンパス以外のURLは使わない）
function pageUrlFor(d, salonId) {
  var url = String(d.detail_url || '').trim();
  if (PAGE_URL_PATTERN.test(url)) return url;
  return DEFAULT_PAGE_URL + encodeURIComponent(salonId);
}

function fetchDetailPage(url) {
  // 転送先もコンパス内に限る（転送は2回まで）
  for (var i = 0; i < 3; i++) {
    if (!PAGE_URL_PATTERN.test(url)) throw new Error('許可していないURL: ' + url);
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: false });
    var code = res.getResponseCode();
    if (code >= 300 && code < 400) {
      var headers = res.getHeaders();
      var loc = headers.Location || headers.location || '';
      if (!loc) break;
      url = /^https?:\/\//.test(loc) ? loc : url.replace(/^(https:\/\/[^\/]+).*$/, '$1') + (loc.charAt(0) === '/' ? '' : '/') + loc;
      continue;
    }
    if (code !== 200) throw new Error('ページ取得失敗 HTTP ' + code);
    return extractText(res.getContentText('UTF-8'));
  }
  throw new Error('ページ取得失敗（転送が多すぎます）');
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

// ─── AIへの指示文（以前は index.html 側で組み立てていたもの） ─────

function buildAdvisorPrompt(d) {
  var kv = function (v) { return (v !== null && v !== undefined) ? String(v) : '-'; };
  var fl = function (v) { return (v == 1 || v === '1' || v === '公開') ? '達成✓' : (v == null ? '未設定' : '未達✗'); };
  var kpiLines = [
    '院名：' + kv(d.name), 'エリア：' + kv(d.area), 'プラン：' + kv(d.compass_plan),
    '検索優先ポイント：' + kv(d.search_point) + 'pt', 'エリア内順位：' + kv(d.area_rank) + '位', '',
    '■ ニーズ1（検索で見つけてもらう）',
    '  アクセス数：' + kv(d.access) + '（目標200）',
    '  店舗PR情報登録：' + fl(d.store_pr), '  予約公開：' + fl(d.reserve_public),
    '  予約GMB設置：' + fl(d.reserve_gmb), '  予約バナー設置：' + fl(d.reserve_banner),
    '  コンパス相互リンク：' + fl(d.compass_link), '',
    '■ ニーズ2（予約ボタンを押してもらう）',
    '  クリック数：' + kv(d.click) + '（目標20）', '  クリック率：' + kv(d.click_rate) + '%（目標10%）',
    '  口コミ件数：' + kv(d.review) + '件（目標5件）', '  口コミ返信：' + kv(d.review_reply) + '件（目標5件）',
    '  PickUp口コミ：' + fl(d.pickup_review), '  口コミパーツ設置：' + fl(d.review_parts),
    '  メニュー3件以上：' + fl(d.menu3), '',
    '■ ニーズ3（実際に予約してもらう）',
    '  予約数：' + kv(d.net_reserve) + '件（目標2件）', '  ネット予約率：' + kv(d.net_reserve_rate) + '%（目標10%）',
    '  メニュー連携：' + fl(d.menu_link), '  ゲスト予約利用：' + fl(d.guest_reserve),
    '  予約受付締切時間：' + kv(d.deadline) + '分前'
  ].join('\n');

  return 'あなたは鍼灸院・整骨院専門のWebマーケティングコンサルタントです。\n'
    + '以下の情報をもとに、カスタマーサクセス担当が院長フォロー時に参照する分析資料を作成してください。\n\n'
    + '【重要】院詳細ページはスマートフォン表示（縦スクロール）を想定して分析してください。\n'
    + '来院を検討している患者が初めてページを見た視点で評価してください。\n\n'
    + '【院詳細ページ情報（shinq-compass.jpより取得）】\n{{PAGE_TEXT}}\n\n'
    + '【現在のKPIデータ】\n' + kpiLines + '\n\n'
    + '## 出力形式\n'
    + '必ず以下のJSON形式のみで返してください。JSONの前後に説明文やコードブロック記号は一切不要です。\n\n'
    + '{"kpi_issues":[{"item":"KPI項目名","problem":"現状（未達成・未設定など）","action":"具体的な対策（1文）"}],'
    + '"page_summary":"スマホで来院検討者視点から見たページ全体の評価（2〜3文）",'
    + '"page_details":['
    + '{"section":"ファーストビュー","score":"◎/○/△/×","comment":"スマホで3秒以内にターゲットを掴めているか（写真・キャッチコピー・予約可能状況）"},'
    + '{"section":"口コミ","score":"◎/○/△/×","comment":"量・質・鮮度の観点で評価"},'
    + '{"section":"特徴","score":"◎/○/△/×","comment":"ターゲットの悩みを解決できそうか・分かりやすさ・写真"},'
    + '{"section":"当院のこだわり","score":"◎/○/△/×","comment":"ターゲットメリットが定義されているか・分かりやすさ・写真"},'
    + '{"section":"メニュー","score":"◎/○/△/×","comment":"ページ内容との合致・時間と価格のバランス・分かりやすさ"},'
    + '{"section":"クーポン","score":"◎/○/△/×","comment":"内容・設定状況を評価"},'
    + '{"section":"スタッフ挨拶","score":"◎/○/△/×","comment":"感情的な共感が得られるか・権威性・信頼性"},'
    + '{"section":"店舗データ","score":"◎/○/△/×","comment":"過不足を評価"},'
    + '{"section":"対応しているこだわり","score":"◎/○/△/×","comment":"過不足を評価"}'
    + '],'
    + '"top3":[{"title":"やること（動詞始まりで短く）","detail":"具体的な手順（50文字以内）","effect":"期待効果（1文）"}]}\n\n'
    + 'kpi_issues: KPIデータで未達成・未設定のもののみ（問題ない項目は含めない）。\n'
    + 'page_details: 必ず9項目すべて・scoreは◎○△×のいずれか。\n'
    + 'top3: 10件程度（最低7件）。KPI改善・ページ改善を合わせて優先度順に。上位3件が最重要。';
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
