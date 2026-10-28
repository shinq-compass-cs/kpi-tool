/**
 * しんきゅうコンパス 代行設置依頼 受付スクリプト
 *
 * 【仕組み】
 * - 依頼内容は「受付一覧」（SHEET_ID の「代行依頼一覧」タブ）に1行ずつ記録する
 * - ホームページのログインID・パスワードは受付一覧に書かず、
 *   担当者だけに共有する「ログイン情報シート」に記録する（受付番号で対応づける）
 * - ログイン情報は、対応状況が「完了・済・不要・キャンセル・中止」になったもの、
 *   または受付から30日を過ぎたものを、毎日自動で消す（purgePasswords）
 *
 * 【初回だけ行うこと】
 * 1. GAS エディタで関数「setup」を選んで実行し、権限を許可する
 *    （ログイン情報シートの作成、既存パスワードの移動、毎日の自動消去の登録）
 * 2. 実行ログに出るログイン情報シートの URL を開き、代行作業の担当者だけに共有する
 */

const SHEET_ID    = '';           // ← 受付一覧（各種ツール導入状況）のスプレッドシートID
const TAB_NAME    = '代行依頼一覧';
const SECRET_NAME = '代行設置ログイン情報（担当者限定）';
const SECRET_TAB  = 'ログイン情報';
const SECRET_PROP = 'SECRET_SHEET_ID';   // ログイン情報シートのIDを入れておくスクリプトプロパティ
const KEEP_DAYS   = 30;                  // 受付から何日でログイン情報を消すか
const DONE_PATTERN = /完了|済|不要|キャンセル|中止/;  // この言葉を含む対応状況になったら消す
const MOVED_MARK  = '別シート';          // 受付一覧のパスワード欄に入れる目印

// 受付一覧の列（見出し名で列を探すので、担当者が列を足しても崩れない）
const HEADERS = [
  '受付日時', 'サロンID', '院名', 'メールアドレス',
  '依頼種別',
  'HP公開URL', '管理画面URL', 'ログインID', 'パスワード',
  'GBP URL',
  '掲載位置', '位置詳細',
  '対応状況', '備考'
];

// ログイン情報シートの列
const SECRET_HEADERS = [
  '受付番号', '受付日時', 'サロンID', '院名', '管理画面URL',
  'ログインID', 'パスワード', '消去日時'
];

// ───────────────────────────────────────────────
// フォームからの受付
// ───────────────────────────────────────────────
function doPost(e) {
  const raw  = (e.parameter && e.parameter.data)
    ? e.parameter.data
    : e.postData.contents;
  const data = JSON.parse(raw);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getListSheet_();
    const col   = ensureHeaders_(sheet, HEADERS);
    const hasLogin = !!(data.login_id || data.password);
    const receiptNo = hasLogin ? newReceiptNo_() : '';

    const values = {
      '受付日時':     data.datetime        || '',
      'サロンID':     data.salon_id        || '',
      '院名':         data.salon_name      || '',
      'メールアドレス': data.email          || '',
      '依頼種別':     Array.isArray(data.types) ? data.types.join('、') : (data.types || ''),
      'HP公開URL':    data.hp_url          || '',
      '管理画面URL':  data.admin_url       || '',
      'ログインID':   hasLogin ? MOVED_MARK : '',
      'パスワード':   hasLogin ? movedText_(receiptNo) : '',
      'GBP URL':      data.gbp_url         || '',
      '掲載位置':     data.position        || '',
      '位置詳細':     data.position_detail || '',
      '対応状況':     '未対応',
      '備考':         data.note            || '',
    };

    // ログイン情報を先に担当者限定シートへ記録してから、受付一覧に書く
    if (hasLogin) {
      getSecretSheet_().appendRow([
        receiptNo, new Date(),
        data.salon_id || '', data.salon_name || '', data.admin_url || '',
        data.login_id || '', data.password || '', ''
      ]);
    }

    const row = new Array(sheet.getLastColumn()).fill('');
    Object.keys(values).forEach(name => { row[col[name] - 1] = values[name]; });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  return ContentService
    .createTextOutput('ok')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ───────────────────────────────────────────────
// 毎日の自動消去（setup で登録したトリガーが実行する）
// ───────────────────────────────────────────────
function purgePasswords() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const moved   = moveLegacyPasswords_();
    const cleared = clearFinishedLogins_();
    console.log('移動 ' + moved + ' 件 / 消去 ' + cleared + ' 件');
    return { moved: moved, cleared: cleared };
  } finally {
    lock.releaseLock();
  }
}

// 初回だけ GAS エディタから実行する
function setup() {
  const secret = getSecretSheet_();
  const result = purgePasswords();

  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'purgePasswords')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('purgePasswords').timeBased().everyDays(1).atHour(3).create();

  console.log('ログイン情報シート：' + secret.getParent().getUrl());
  console.log('既存パスワードの移動：' + result.moved + ' 件 / 消去：' + result.cleared + ' 件');
  console.log('毎日3時台の自動消去を登録しました。上のシートを担当者だけに共有してください。');
}

// ───────────────────────────────────────────────
// 内部処理
// ───────────────────────────────────────────────

// 受付一覧に残っているパスワードを、ログイン情報シートへ移す
function moveLegacyPasswords_() {
  const sheet = getListSheet_();
  const col   = ensureHeaders_(sheet, HEADERS);
  const last  = sheet.getLastRow();
  if (last < 2) return 0;

  const n     = last - 1;
  const dates = sheet.getRange(2, col['受付日時'], n, 1).getValues();
  const ids   = sheet.getRange(2, col['サロンID'], n, 1).getValues();
  const names = sheet.getRange(2, col['院名'], n, 1).getValues();
  const urls  = sheet.getRange(2, col['管理画面URL'], n, 1).getValues();
  const loginRange = sheet.getRange(2, col['ログインID'], n, 1);
  const pwRange    = sheet.getRange(2, col['パスワード'], n, 1);
  const logins = loginRange.getValues();
  const pws    = pwRange.getValues();

  const secretRows = [];
  const used = {};
  for (let i = 0; i < n; i++) {
    const login = String(logins[i][0]);
    const pw    = String(pws[i][0]);
    if (pw.indexOf(MOVED_MARK) === 0) continue;   // 移動済み
    if (!login && !pw) continue;                  // ログイン情報なし
    let no = newReceiptNo_();
    while (used[no]) no = newReceiptNo_();
    used[no] = true;
    secretRows.push([no, dates[i][0], ids[i][0], names[i][0], urls[i][0], login, pw, '']);
    logins[i][0] = MOVED_MARK;
    pws[i][0]    = movedText_(no);
  }
  if (secretRows.length === 0) return 0;

  // 先に移動先へ書いてから、受付一覧を書き換える（途中で失敗しても消えないように）
  const secret = getSecretSheet_();
  secret.getRange(secret.getLastRow() + 1, 1, secretRows.length, SECRET_HEADERS.length)
    .setValues(secretRows);
  SpreadsheetApp.flush();
  loginRange.setValues(logins);
  pwRange.setValues(pws);
  return secretRows.length;
}

// 完了した依頼・30日を過ぎた依頼のログイン情報を消す
function clearFinishedLogins_() {
  // 受付番号 → 対応状況
  const list = getListSheet_();
  const col  = ensureHeaders_(list, HEADERS);
  const status = {};
  if (list.getLastRow() >= 2) {
    const n   = list.getLastRow() - 1;
    const pws = list.getRange(2, col['パスワード'], n, 1).getValues();
    const sts = list.getRange(2, col['対応状況'], n, 1).getValues();
    for (let i = 0; i < n; i++) {
      const no = receiptNoFrom_(String(pws[i][0]));
      if (no) status[no] = String(sts[i][0]);
    }
  }

  const secret = getSecretSheet_();
  const last = secret.getLastRow();
  if (last < 2) return 0;
  const range = secret.getRange(2, 1, last - 1, SECRET_HEADERS.length);
  const rows  = range.getValues();
  const now   = new Date();
  const limit = now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let cleared = 0;

  rows.forEach(r => {
    if (r[7]) return;                     // 消去済み
    if (!r[5] && !r[6]) return;           // ログイン情報なし
    const st = status[r[0]];
    const received = toDate_(r[1]);
    let reason = '';
    if (st === undefined)              reason = '受付一覧に該当行なし';
    else if (DONE_PATTERN.test(st))    reason = st;
    else if (!received || received.getTime() < limit) reason = KEEP_DAYS + '日経過';
    if (!reason) return;
    r[5] = '';
    r[6] = '';
    r[7] = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '（' + reason + '）';
    cleared++;
  });
  if (cleared > 0) range.setValues(rows);
  return cleared;
}

function getListSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ログイン情報シートを開く。まだ無ければ作る（作った直後は持ち主しか見られない）
function getSecretSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(SECRET_PROP);
  let ss = id ? SpreadsheetApp.openById(id) : null;
  if (!ss) {
    ss = SpreadsheetApp.create(SECRET_NAME);
    props.setProperty(SECRET_PROP, ss.getId());
  }
  let sheet = ss.getSheetByName(SECRET_TAB);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(SECRET_TAB);
    sheet.getRange(1, 1, 1, SECRET_HEADERS.length).setValues([SECRET_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 1行目の見出しから列番号を返す。足りない見出しは右端に足す
function ensureHeaders_(sheet, headers) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const col = {};
  row1.forEach((h, i) => { if (h && !(h in col)) col[h] = i + 1; });
  let next = row1.reduce((m, h, i) => (h ? i + 1 : m), 0) + 1;
  headers.forEach(h => {
    if (!(h in col)) {
      sheet.getRange(1, next).setValue(h);
      col[h] = next++;
    }
  });
  return col;
}

function newReceiptNo_() {
  const stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyMMdd-HHmmss');
  const rand  = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'D' + stamp + '-' + rand;
}

function movedText_(no) {
  return MOVED_MARK + '（受付番号 ' + no + '）';
}

function receiptNoFrom_(text) {
  const m = text.match(/受付番号 (D[0-9A-Z-]+)）/);
  return m ? m[1] : '';
}

// 受付日時（日付の値、または「2026/3/5 12:34:56」形式の文字列）を日付にする
function toDate_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const m = String(v).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}
