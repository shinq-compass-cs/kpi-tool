/**
 * ログインログ記録スクリプト
 *
 * 【手順】
 * 1. https://sheet.new で新しいスプレッドシートを作成
 * 2. URLからスプレッドシートIDをコピーして LOG_SHEET_ID に貼り付け
 * 3. 「拡張機能」→「Apps Script」を開く
 * 4. このコードを貼り付けて保存
 * 5. 「デプロイ」→「新しいデプロイ」→「種類：ウェブアプリ」
 *    ・次のユーザーとして実行：自分
 *    ・アクセスできるユーザー：全員
 *    → 「デプロイ」→ 表示されるURLをコピー
 * 6. コピーしたURLをindex.htmlの GAS_LOG_URL に貼り付け
 */

const LOG_SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← 作成したスプレッドシートのIDに変更
const LOG_TAB_NAME = 'ログ';

function doPost(e) {
  try {
    const raw = (e.parameter && e.parameter.data)
      ? e.parameter.data
      : e.postData.contents;
    const data = JSON.parse(raw);

    const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    let sheet = ss.getSheetByName(LOG_TAB_NAME);

    // シートが無ければ作成してヘッダーを追加
    if (!sheet) {
      sheet = ss.insertSheet(LOG_TAB_NAME);
      sheet.appendRow([
        '種別', '日時（ログイン）', '記録日時（GAS）', 'サロンID', 'サロン名', '端末',
        'URL1', 'URL2', 'URL3', 'URL4', 'URL5',
        'URL6', 'URL7', 'URL8', 'URL9', 'URL10'
      ]);
      sheet.setFrozenRows(1);
      sheet.getRange('A1:P1').setFontWeight('bold');
    }

    const urls = (data.urls || []).concat(Array(10).fill('')).slice(0, 10);
    const gasTimestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    sheet.appendRow([
      data.type       || 'ログイン',
      data.datetime   || '',
      gasTimestamp,
      data.salon_id   || '',
      data.salon_name || '',
      data.device     || '',
      ...urls
    ]);

    return ContentService.createTextOutput('ok');
  } catch (err) {
    // エラー内容もシートに記録する
    try {
      const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
      const errSheet = ss.getSheetByName('エラーログ') || ss.insertSheet('エラーログ');
      errSheet.appendRow([new Date(), err.message, JSON.stringify(e)]);
    } catch (_) {}
    return ContentService.createTextOutput('error: ' + err.message);
  }
}
