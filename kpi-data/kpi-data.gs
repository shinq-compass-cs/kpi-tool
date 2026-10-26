// ============================================================
// kpi-data.gs — KPIツールのデータ受け渡し（GAS Web App）
//
// 【役割】サロンID＋メールアドレスを照合し、本人の数字と、
//         比較用の匿名データ（院名・メール・サロンIDを除く）だけを返す。
//         シートはこのGASの持ち主の権限で読むため、ページ側に鍵は不要。
//
// 【スクリプトプロパティ】（「プロジェクトの設定」→「スクリプトプロパティ」）
//   CS_PASSPHRASE  = 社内用の合言葉（メール欄に入力すると、どの院も表示でき社内機能が出る）
//   ※ 合言葉はこのファイルに書かない（リポジトリは公開されているため）
//
// 【デプロイ】ウェブアプリ／実行ユーザー：自分／アクセスできるユーザー：全員
//   ※ clasp deploy は使わない（アクセス設定が「自分のみ」に戻るため）
// ============================================================

// シートの共有を「制限付き」にすれば、番号が知られても中身は読めない
const SPREADSHEET_ID = '1CiuXRdYG-lI_jWA4DiR_uXvYU9dgqTE1v-JWsZF1l_g';
const FREE_TRIAL_SHEET = '無料体験';
const MAX_MONTHS = 24;          // 推移グラフで遡る最大月数
const LATEST_LOOKBACK = 3;      // 当月タブ未作成の月初は、直近3か月以内の既存タブを最新として扱う
const READ_MAX_ROWS = 1200;
const READ_RANGE = 'A1:BZ' + READ_MAX_ROWS;
const HEADER_RANGE = 'A1:BZ5';  // 見出し行は先頭5行以内にある
const CACHE_SECONDS = 600;      // 同じ院の再ログインを速くするための一時保存（10分）
const MAX_FAILS = 10;           // 同じサロンIDでメール不一致がこの回数続いたら一時的に受け付けない
const LOCK_SECONDS = 900;       // 受け付けない時間（15分。最後の失敗から数える）

// エリア比較に使う項目だけを他院データとして返す
const AREA_KEYS = [
  'compass_plan', 'store_pr', 'reserve_public', 'reserve_gmb', 'reserve_banner',
  'compass_link', 'review_parts', 'review', 'review_reply', 'pickup_review',
  'menu3', 'guest_reserve', 'menu_link', 'deadline',
];

// 初回だけエディタで実行し、シート読み取りの許可を与える（合言葉の設定も確認する）
function setup() {
  const title = Sheets.Spreadsheets.get(SPREADSHEET_ID, { fields: 'properties.title' }).properties.title;
  const hasPass = !!PropertiesService.getScriptProperties().getProperty('CS_PASSPHRASE');
  console.log('シート読み取りOK：' + title + ' ／ 合言葉の設定：' + (hasPass ? 'あり' : 'なし（要設定）'));
}

function doPost(e) {
  try {
    const raw = (e.parameter && e.parameter.data)
      ? e.parameter.data
      : (e.postData ? e.postData.contents : '{}');
    const req = JSON.parse(raw);
    const salonId = String(req.salon_id || '').trim();
    const email = String(req.email || '').trim().toLowerCase();
    if (!salonId || !email) return jsonResp({ ok: false, error: 'missing' });
    return jsonResp(login(salonId, email));
  } catch (err) {
    console.error(err);
    return jsonResp({ ok: false, error: 'server' });
  }
}

function login(salonId, email) {
  const passphrase = String(
    PropertiesService.getScriptProperties().getProperty('CS_PASSPHRASE') || ''
  ).trim().toLowerCase();
  const isInternal = passphrase !== '' && email === passphrase;

  // 総当たり対策：失敗が続いたIDは、合言葉以外を一時的に受け付けない（シートも読まない）
  const cache = CacheService.getScriptCache();
  const failKey = 'kpi_fail_' + salonId;
  const fails = Number(cache.get(failKey) || 0);
  if (!isInternal && fails >= MAX_FAILS) return { ok: false, error: 'locked' };

  const payload = getSalonPayload(salonId);
  if (!payload) return { ok: false, error: 'not_found' };
  if (!isInternal && payload.owner_email !== email) {
    cache.put(failKey, String(fails + 1), LOCK_SECONDS);
    return { ok: false, error: fails + 1 >= MAX_FAILS ? 'locked' : 'email_mismatch' };
  }
  if (fails) cache.remove(failKey);

  const res = payload.data;
  res.ok = true;
  res.is_internal = isInternal;
  return res;
}

// 一時保存があればそれを使い、なければシートから組み立てる（照合用メールは保存データ内に保持）
function getSalonPayload(salonId) {
  const cache = CacheService.getScriptCache();
  const key = 'kpi_v1_' + salonId;
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const payload = buildSalonPayload(salonId);
  if (payload) {
    try { cache.put(key, JSON.stringify(payload), CACHE_SECONDS); } catch (e) { /* 100KB超などは保存しない */ }
  }
  return payload;
}

function buildSalonPayload(salonId) {
  const spreadsheetId = SPREADSHEET_ID;
  const meta = Sheets.Spreadsheets.get(spreadsheetId, { fields: 'sheets.properties.title' });
  const titles = new Set((meta.sheets || []).map(s => s.properties.title));

  const monthlyNames = [];
  for (let o = 0; o <= MAX_MONTHS; o++) monthlyNames.push(monthlySheetName(o));

  // --- 1回目の読み取り：最新候補3か月と無料体験は全体、4か月目以降は見出しだけ ---
  const req1 = [];
  monthlyNames.forEach((name, o) => {
    if (!titles.has(name)) return;
    const full = o < LATEST_LOOKBACK;
    req1.push({ offset: o, full, range: a1(name, full ? READ_RANGE : HEADER_RANGE) });
  });
  if (titles.has(FREE_TRIAL_SHEET)) req1.push({ free: true, range: a1(FREE_TRIAL_SHEET, READ_RANGE) });
  const res1 = batchGet(spreadsheetId, req1.map(r => r.range));

  const monthlyFull = {};
  const monthlyHead = {};
  let freeTrialRows = [];
  req1.forEach((r, i) => {
    if (r.free) freeTrialRows = res1[i];
    else if (r.full) monthlyFull[r.offset] = res1[i];
    else monthlyHead[r.offset] = res1[i];
  });

  // --- 最新月次でサロンを探す ---
  let found = null;
  let foundSheet = null;
  let firstSheetRows = null, firstSheetHm = null;
  for (let o = 0; o < LATEST_LOOKBACK; o++) {
    const rows = monthlyFull[o] || [];
    if (!rows.length) continue;
    const hi = findHeaderRowIndex(rows);
    firstSheetHm = buildHeaderMap(rows[hi]);
    firstSheetRows = rows;
    const r = findSalonRowIndex(rows, hi, firstSheetHm, salonId);
    if (r >= 0) {
      found = parseRowDynamic(rows[r], firstSheetHm);
      found.salon_id = salonId;
      found.detail_url = String(rows[r][49] || '').trim() || null; // AX列
      foundSheet = monthlyNames[o];
    }
    break; // 最初に見つかった実在タブを「最新月次」として扱う
  }

  // --- 最新月次になければ無料体験タブを探す ---
  let freeTrialHm = null;
  if (freeTrialRows.length) {
    freeTrialHm = buildHeaderMap(freeTrialRows[findHeaderRowIndex(freeTrialRows)]);
  }
  if (!found && freeTrialHm) {
    const hi = findHeaderRowIndex(freeTrialRows);
    const r = findSalonRowIndex(freeTrialRows, hi, freeTrialHm, salonId);
    // F列が空の行は失効扱い（管理者が行を消して失効管理している）
    if (r >= 0 && freeTrialRows[r][5]) {
      found = parseRowDynamic(freeTrialRows[r], freeTrialHm);
      found.salon_id = salonId;
      found.detail_url = String(freeTrialRows[r][9] || '').trim() || null; // J列
      foundSheet = FREE_TRIAL_SHEET;
    }
  }

  if (!found) return null;

  // --- 到達可能ポイント・順位（最新月次優先、なければ無料体験タブ） ---
  const refRows = firstSheetRows || (freeTrialRows.length ? freeTrialRows : null);
  const refHm = firstSheetHm || freeTrialHm;
  const addPt = calcAdditionalPoints(found);
  const maxPt = Number(found.search_point || 0) + addPt;
  found.add_pt = addPt;
  found.potential_max_pt = maxPt;
  found.potential_rank = refRows ? calcPotentialRank(found.area, maxPt, refRows, refHm) : null;
  found.first_place_pt = refRows ? calcFirstPlacePt(found.area, refRows, refHm) : null;

  // --- 月次推移 ---
  const trend = buildTrend(spreadsheetId, salonId, monthlyNames, monthlyFull, monthlyHead);

  // --- 有料院平均値（最新月次タブ全行） ---
  const avg = (firstSheetRows && firstSheetHm) ? calcSheetAverages(firstSheetRows, firstSheetHm) : null;

  // --- 同エリア院データ（院名・メール・サロンIDを外した比較項目のみ） ---
  const areaRows = [];
  if (found.area) {
    const areaVal = String(found.area).trim();
    const seen = new Set();
    const collect = (allRows, hm) => {
      const areaIdx = hm['検索順位エリア'];
      if (areaIdx === undefined) return;
      const hi = findHeaderRowIndex(allRows);
      for (let i = hi + 1; i < allRows.length; i++) {
        if (String(allRows[i][areaIdx] || '').trim() !== areaVal) continue;
        const parsed = parseRowDynamic(allRows[i], hm);
        const id = String(parsed.salon_id).trim();
        if (seen.has(id)) continue;
        seen.add(id);
        const out = { is_self: id === salonId };
        AREA_KEYS.forEach(k => { out[k] = parsed[k]; });
        areaRows.push(out);
      }
    };
    if (firstSheetRows && firstSheetHm) collect(firstSheetRows, firstSheetHm);
    if (freeTrialRows.length && freeTrialHm) collect(freeTrialRows, freeTrialHm);
  }

  const ownerEmail = found.email;
  delete found.email;
  return {
    owner_email: ownerEmail,
    data: { found, found_sheet: foundSheet, trend, avg, area_rows: areaRows },
  };
}

// 月次推移：最新候補3か月は読み取り済みの全体から、4か月目以降は「ID列→該当行」の順に必要分だけ読む
function buildTrend(spreadsheetId, salonId, monthlyNames, monthlyFull, monthlyHead) {
  const perOffset = {}; // offset → { exists, row, hm }

  for (let o = 0; o < LATEST_LOOKBACK; o++) {
    const rows = monthlyFull[o] || [];
    if (!rows.length) continue;
    const hi = findHeaderRowIndex(rows);
    const hm = buildHeaderMap(rows[hi]);
    const r = findSalonRowIndex(rows, hi, hm, salonId);
    perOffset[o] = { exists: true, row: r >= 0 ? rows[r] : null, hm };
  }

  const idLookups = [];
  for (let o = LATEST_LOOKBACK; o <= MAX_MONTHS; o++) {
    const head = monthlyHead[o] || [];
    if (!head.length) continue;
    const hi = findHeaderRowIndex(head);
    const hm = buildHeaderMap(head[hi]);
    const idCol = hm['サロンID'] ?? 0;
    perOffset[o] = { exists: true, row: null, hm };
    const L = colLetter(idCol);
    idLookups.push({ offset: o, hi, range: a1(monthlyNames[o], L + '1:' + L + READ_MAX_ROWS) });
  }
  const idCols = batchGet(spreadsheetId, idLookups.map(x => x.range));

  const rowLookups = [];
  idLookups.forEach((x, i) => {
    const colVals = idCols[i];
    for (let r = x.hi + 1; r < colVals.length; r++) {
      if (String((colVals[r] || [])[0] || '').replace(/,/g, '').trim() === salonId) {
        const sheetRow = r + 1;
        rowLookups.push({ offset: x.offset, range: a1(monthlyNames[x.offset], 'A' + sheetRow + ':BZ' + sheetRow) });
        break;
      }
    }
  });
  const rows = batchGet(spreadsheetId, rowLookups.map(x => x.range));
  rowLookups.forEach((x, i) => { perOffset[x.offset].row = rows[i][0] || []; });

  // 3か月連続で見つからなければ打ち切り（従来仕様）
  const trend = [];
  let missCount = 0;
  for (let o = 0; o <= MAX_MONTHS; o++) {
    if (missCount >= 3) break;
    const p = perOffset[o];
    if (!p || !p.row) { missCount++; continue; }
    const data = parseRowDynamic(p.row, p.hm);
    delete data.email;
    trend.unshift({ sheet: monthlyNames[o], data });
    missCount = 0;
  }
  return trend;
}

// ===== シート読み取りの補助 =====

function batchGet(spreadsheetId, ranges) {
  if (!ranges.length) return [];
  const res = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, { ranges });
  return (res.valueRanges || []).map(v => v.values || []);
}

function a1(sheetName, range) {
  return "'" + String(sheetName).replace(/'/g, "''") + "'!" + range;
}

// 0始まりの列番号 → A1形式の列記号（0→A、25→Z、26→AA）
function colLetter(idx) {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// 月次タブ名を日本時間で自動生成（YYMM形式。offsetMonths=0→当月）
function monthlySheetName(offsetMonths) {
  const ym = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM').split('-');
  const total = Number(ym[0]) * 12 + (Number(ym[1]) - 1) - offsetMonths;
  const yy = String(Math.floor(total / 12)).slice(-2);
  const mm = String(total % 12 + 1).padStart(2, '0');
  return yy + mm;
}

function findSalonRowIndex(rows, hi, hm, salonId) {
  const idCol = hm['サロンID'] ?? 0;
  for (let i = hi + 1; i < rows.length; i++) {
    if (String(rows[i][idCol] || '').replace(/,/g, '').trim() === salonId) return i;
  }
  return -1;
}

// ===== ここから下は index.html から移した計算（内容は従来どおり） =====

// 先頭から最大5行を走査して「サロンID」を含む行を見出し行とみなす
function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (rows[i] && rows[i].some(cell => String(cell || '').trim() === 'サロンID')) return i;
  }
  return 0;
}

// 見出し名 → 列番号（セル内改行を除去、初出を優先）
function buildHeaderMap(headerRow) {
  const map = {};
  if (!headerRow) return map;
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || '').replace(/\n/g, '').trim();
    if (h && !(h in map)) map[h] = i;
  }
  return map;
}

// 書式付き文字列 "1,000" を数値にする
function parseNum(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return parseFloat(typeof v === 'string' ? v.replace(/,/g, '') : v);
}

function parseRowDynamic(row, hm) {
  const getVal = (idx) => {
    if (idx === undefined) return null;
    const val = row[idx];
    if (val === undefined || val === null || val === '' || val === '#N/A') return null;
    const num = parseNum(val);
    return isNaN(num) ? val : num;
  };

  // 複数候補キーで検索：完全一致 → 前方一致（「アクセス数」→「アクセス数（30日）」）→ 次候補
  const findIdx = (...keys) => {
    for (const key of keys) {
      if (hm[key] !== undefined) return hm[key];
      const found = Object.keys(hm).find(k => k.startsWith(key) && k !== key);
      if (found !== undefined) return hm[found];
    }
    return undefined;
  };
  const get = (...keys) => getVal(findIdx(...keys));

  const emailIdx = findIdx('メールアドレス');
  return {
    salon_id:          String(getVal(findIdx('サロンID')) || '').trim(),
    name:              get('院名'),
    email:             emailIdx !== undefined ? String(row[emailIdx] || '').trim().toLowerCase() : '',
    login:             get('ログイン'),
    compass_plan:      get('コンパス現在プラン', 'しんきゅうコンパス：プラン'),
    yoyaku_plan:       get('予約現在プラン', 'しんきゅう予約：現在のプラン'),
    area:              get('検索順位エリア'),
    area_rank:         get('エリア内ランキング'),
    search_point:      get('検索優先ポイント', '掲載優先ポイント'),
    access:            get('アクセス数'),
    click:             get('クリック数', '予約ボタンクリック数'),
    net_reserve:       get('ネット予約数'),
    reserve_public:    get('予約公開状態', '予約公開利用院'),
    reserve_gmb:       get('予約GMB'),
    reserve_banner:    get('予約バナー'),
    compass_link:      get('HP相互リンク', 'コンパス相互リンク設置'),
    review_parts:      get('口コミパーツ'),
    pickup_review:     get('口コミpickup', 'PickUp口コミ'),
    store_pr:          get('店舗PR情報登録'),
    menu3:             get('メニュー3件以上登録'),
    menu_link:         get('メニュー連携'),
    guest_reserve:     get('ゲスト予約利用'),
    deadline:          get('予約受付締切時間'),
    calendar_count:    get('カレンダー登録件数'),
    net_reserve_count: get('ネット予約件数', 'ネット予約'),
    manual_count:      get('手動登録件数', '手動登録'),
    block_count:       get('ブロック件数', 'ブロック'),
    review:            get('口コミ件数', '口コミ5件以上'),
    review_reply:      get('口コミ返信数', '口コミ返信５件以上'),
  };
}

// 戻り値: 'diamond' | 'platina' | 'premium' | 'free'
function getPlanType(compassPlan) {
  const p = String(compassPlan || '').trim();
  if (p.includes('ダイヤモンド')) return 'diamond';
  if (p.includes('プラチナ')) return 'platina';
  if (p.includes('プレミアム')) return 'premium';
  return 'free';
}

function calcFirstPlacePt(area, allRows, hm) {
  const areaIdx = hm['検索順位エリア'];
  const ptIdx   = hm['検索優先ポイント'] ?? hm['掲載優先ポイント'];
  if (areaIdx === undefined || ptIdx === undefined) return null;
  const hi = findHeaderRowIndex(allRows);
  let maxPt = 0;
  for (let i = hi + 1; i < allRows.length; i++) {
    const rowArea = String(allRows[i][areaIdx] || '').trim();
    const rowPt   = parseNum(allRows[i][ptIdx]);
    if (rowArea === String(area || '').trim() && !isNaN(rowPt)) maxPt = Math.max(maxPt, rowPt);
  }
  return maxPt;
}

// 未達成の加点項目の合計（初月ボーナス・継続利用ポイントは含まない）
function calcAdditionalPoints(d) {
  const plan = getPlanType(d.compass_plan);
  const isPaid = plan !== 'free';
  const isPlatinaOrDiamond = plan === 'platina' || plan === 'diamond';
  const storePrPt = isPlatinaOrDiamond ? 200 : (plan === 'premium' ? 100 : 50);
  const reviewPartsPt = isPaid ? 30 : 0;
  const items = [
    { key: 'store_pr',       point: storePrPt,     type: 'flag' },
    { key: 'reserve_public', point: 50,            type: 'flag_str' },
    { key: 'reserve_gmb',    point: 50,            type: 'flag' },
    { key: 'reserve_banner', point: 50,            type: 'flag' },
    { key: 'compass_link',   point: 30,            type: 'flag' },
    { key: 'review_parts',   point: reviewPartsPt, type: 'flag' },
  ];
  let add = 0;
  for (const item of items) {
    if (item.point === 0) continue;
    const val = d[item.key];
    const achieved = item.type === 'flag' ? (Number(val) >= 1) : (val == 1 || val === '公開');
    if (!achieved) add += item.point;
  }
  return add;
}

function calcSheetAverages(allRows, hm) {
  const hi = findHeaderRowIndex(allRows);
  const acc = [], ctr = [], cvr = [], rev = [];
  for (let i = hi + 1; i < allRows.length; i++) {
    const d = parseRowDynamic(allRows[i], hm);
    if (d.access > 0)  acc.push(d.access);
    if (d.access > 0 && d.click != null)  ctr.push(d.click / d.access * 100);
    if (d.click > 0 && d.net_reserve != null) cvr.push(d.net_reserve / d.click * 100);
    if (d.review != null && d.review >= 0)  rev.push(d.review);
  }
  const avg = arr => arr.length ? parseFloat((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : null;
  return { access: avg(acc), ctr: avg(ctr), cvr: avg(cvr), review: avg(rev) };
}

// maxPt を達成した場合のエリア内順位
function calcPotentialRank(area, maxPt, allRows, hm) {
  const areaIdx = hm['検索順位エリア'];
  const ptIdx   = hm['検索優先ポイント'] ?? hm['掲載優先ポイント'];
  if (areaIdx === undefined || ptIdx === undefined) return null;
  const startRow = findHeaderRowIndex(allRows) + 1;
  let countAbove = 0;
  for (let i = startRow; i < allRows.length; i++) {
    const rowArea = String(allRows[i][areaIdx] || '').trim();
    const rowPt   = parseNum(allRows[i][ptIdx]);
    if (rowArea === String(area || '').trim() && !isNaN(rowPt) && rowPt > maxPt) countAbove++;
  }
  return countAbove + 1;
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
