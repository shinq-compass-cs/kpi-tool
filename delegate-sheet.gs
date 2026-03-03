/**
 * しんきゅうコンパス 代行設置依頼 受付スクリプト
 *
 * 【セットアップ手順】
 * 1. 新しいGoogleスプレッドシートを作成し、そのIDを SHEET_ID に貼り付ける
 * 2. スプレッドシートのアクセス権を「担当者のみ」に制限する（共有は最小限に）
 * 3. script.google.com で新プロジェクトを作成し、このコードを貼り付けて保存
 * 4. 「デプロイ」→「新しいデプロイ」→ 種類：ウェブアプリ
 *    実行ユーザー：自分 / アクセス：全員
 * 5. デプロイURLをコピーして index.html の DELEGATE_GAS_URL に貼り付ける
 */

const SHEET_ID  = '';        // ← 受付用スプレッドシートのIDを貼り付け
const TAB_NAME  = '代行依頼一覧';

function doPost(e) {
  const raw  = (e.parameter && e.parameter.data)
    ? e.parameter.data
    : e.postData.contents;
  const data = JSON.parse(raw);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(TAB_NAME);

  // タブが存在しなければ作成してヘッダーを設定
  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME);
    sheet.appendRow([
      '受付日時', 'サロンID', '院名', 'メールアドレス',
      '依頼種別',
      'HP公開URL', '管理画面URL', 'ログインID', 'パスワード',
      'GBP URL',
      '掲載位置', '位置詳細',
      '対応状況'
    ]);
    sheet.setFrozenRows(1);

    // 列幅を調整
    sheet.setColumnWidth(1, 140);  // 受付日時
    sheet.setColumnWidth(4, 180);  // メールアドレス
    sheet.setColumnWidth(5, 200);  // 依頼種別
    sheet.setColumnWidth(6, 200);  // HP公開URL
    sheet.setColumnWidth(10, 200); // GBP URL

    // パスワード列（I列=9列目）を薄いグレーで塗りつぶして注意喚起
    sheet.getRange(1, 9).setBackground('#fce8e6').setFontColor('#c00000');
  }

  const types = Array.isArray(data.types) ? data.types.join('、') : (data.types || '');

  sheet.appendRow([
    data.datetime        || '',
    data.salon_id        || '',
    data.salon_name      || '',
    data.email           || '',
    types,
    data.hp_url          || '',
    data.admin_url       || '',
    data.login_id        || '',
    data.password        || '',
    data.gbp_url         || '',
    data.position        || '',
    data.position_detail || '',
    '未対応',          // 対応状況（初期値）
  ]);

  return ContentService
    .createTextOutput('ok')
    .setMimeType(ContentService.MimeType.TEXT);
}
