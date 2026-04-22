/**
 * ログ記録エンドポイント（統合版）
 *
 * 同一プロジェクト内の別ファイル error-log-receiver.gs と doPost が競合していたため統合。
 *
 * 振り分けルール:
 *  - e.parameter.data あり → KPIツール（FormData経由でログイン/クリック履歴）
 *  - それ以外            → CMSエラーログ（JSON body + トークン認証）
 *
 * 注意: error-log-receiver.gs の doPost は handleCmsError(body) にリネーム済み。
 *
 * 【デプロイ】
 * - プロジェクト名: 各種エラーログ
 * - Apps Script ID: 1lFV5gK2oi3BE5-b0uR60ii4hoZMUSD0b2ib6UnyIVZIJlhV7sbbNaXSI
 * - Web App URL: https://script.google.com/macros/s/AKfycbyUQ7zwgR4lT5eHddLBYnA2Oob55Z63kh4vlHZM7ZaPCEwfNu6oqqFwKsd5zJ4tYOWa/exec
 * - 更新手順: デプロイ → デプロイを管理 → 鉛筆アイコン → バージョン「新バージョン」→ デプロイ
 */

const LOG_SHEET_ID = '16g2oaMd0Z7ATpNQBbUliRYx-06nbMertF0zLPKdnbQg';
const LOG_TAB_NAME = 'KPIツールログ';

function doPost(e) {
  try {
    // KPIツール: FormData 経由
    if (e.parameter && e.parameter.data) {
      return handleKpiLog(JSON.parse(e.parameter.data));
    }
    // CMSツール: JSON body 経由
    const body = JSON.parse(e.postData.contents);
    return handleCmsError(body);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleKpiLog(data) {
  const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
  let sheet = ss.getSheetByName(LOG_TAB_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(LOG_TAB_NAME);
    sheet.appendRow([
      '日時', 'サロンID', 'サロン名', '端末',
      'URL1', 'URL2', 'URL3', 'URL4', 'URL5',
      'URL6', 'URL7', 'URL8', 'URL9', 'URL10'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:N1').setFontWeight('bold');
  }

  const urls = (data.urls || []).concat(Array(10).fill('')).slice(0, 10);
  sheet.appendRow([
    data.datetime,
    data.salon_id,
    data.salon_name,
    data.device,
    ...urls
  ]);

  return ContentService.createTextOutput('ok');
}

// 手動テスト（KPIツールログへの書き込み確認用）
function testAppend() {
  const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
  const sheet = ss.getSheetByName(LOG_TAB_NAME);
  Logger.log('sheet: ' + (sheet ? 'found' : 'NOT FOUND'));
  if (sheet) {
    sheet.appendRow(['テスト', new Date(), 'manual']);
    Logger.log('appended');
  }
}
