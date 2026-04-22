/**
 * しんきゅうコンパス 集客フォローツール 仕様書
 * Google ドキュメント自動生成スクリプト
 *
 * 【実行手順】
 * 1. https://script.google.com を開いて「新しいプロジェクト」を作成
 * 2. このコードを貼り付けて保存
 * 3. 「createSpecDoc」を選択して実行
 * 4. 権限を許可（Googleアカウントで承認）
 * 5. 実行ログに表示されたURLを開く → 指定フォルダに保存済み
 */

function createSpecDoc() {
  const FOLDER_ID = '1Ik2wZqtUE9bHJuyWGsyp3d1hYjU5D2iS';
  const DOC_TITLE  = 'しんきゅうコンパス 集客フォローツール 仕様書';

  // ===== ドキュメント作成 =====
  const doc  = DocumentApp.create(DOC_TITLE);
  const body = doc.getBody();
  body.clear();

  // フォント・余白設定
  body.setMarginTop(56).setMarginBottom(56).setMarginLeft(72).setMarginRight(72);

  // フォルダに移動（マイドライブのルートから除去）
  const file = DriveApp.getFileById(doc.getId());
  DriveApp.getFolderById(FOLDER_ID).addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  // ===== カラー定数 =====
  const C_HEADER_BG   = '#2c4a72'; // ヘッダー行背景（ネイビー）
  const C_HEADER_FG   = '#ffffff'; // ヘッダー行文字
  const C_ALT_BG      = '#f0f4f8'; // テーブル交互行
  const C_CODE_BG     = '#f5f5f5'; // コードブロック背景
  const C_ACCENT      = '#2c4a72'; // 見出しアクセント色
  const C_NOTE_BG     = '#fff3cd'; // 注意書き背景

  // ===== ヘルパー関数 =====

  function h1(text) {
    const p = body.appendParagraph(text);
    p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    p.editAsText().setForegroundColor(C_ACCENT).setBold(true);
    return p;
  }

  function h2(text) {
    const p = body.appendParagraph(text);
    p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    return p;
  }

  function h3(text) {
    const p = body.appendParagraph(text);
    p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    return p;
  }

  function para(text, bold) {
    const p = body.appendParagraph(text);
    p.setSpacingBefore(2).setSpacingAfter(2);
    if (bold) p.editAsText().setBold(true);
    return p;
  }

  function bullet(text) {
    const p = body.appendListItem(text);
    p.setGlyphType(DocumentApp.GlyphType.BULLET);
    p.setSpacingBefore(1).setSpacingAfter(1);
    return p;
  }

  function code(text) {
    const p = body.appendParagraph(text);
    p.setFontFamily('Courier New').setFontSize(9);
    p.setBackgroundColor(C_CODE_BG);
    p.setSpacingBefore(4).setSpacingAfter(4);
    return p;
  }

  function note(text) {
    const p = body.appendParagraph('⚠ ' + text);
    p.setBackgroundColor(C_NOTE_BG);
    p.setFontSize(10).setItalic(true);
    p.setSpacingBefore(4).setSpacingAfter(4);
    return p;
  }

  function sep() {
    body.appendHorizontalRule();
    body.appendParagraph('').setSpacingAfter(0);
  }

  function table(rows, alternateRows) {
    const tbl = body.appendTable(rows);
    tbl.setBorderColor('#cccccc').setBorderWidth(1);

    // ヘッダー行スタイル
    const hRow = tbl.getRow(0);
    for (let c = 0; c < hRow.getNumCells(); c++) {
      const cell = hRow.getCell(c);
      cell.setBackgroundColor(C_HEADER_BG);
      cell.editAsText().setForegroundColor(C_HEADER_FG).setBold(true);
    }

    // データ行の交互配色
    if (alternateRows !== false) {
      for (let r = 1; r < tbl.getNumRows(); r++) {
        if (r % 2 === 0) {
          const row = tbl.getRow(r);
          for (let c = 0; c < row.getNumCells(); c++) {
            row.getCell(c).setBackgroundColor(C_ALT_BG);
          }
        }
      }
    }
    body.appendParagraph('').setSpacingAfter(0);
    return tbl;
  }

  // ===== ドキュメント本文 =====

  // タイトル
  const titleP = body.appendParagraph(DOC_TITLE);
  titleP.setHeading(DocumentApp.ParagraphHeading.TITLE);
  titleP.editAsText().setForegroundColor(C_ACCENT);

  body.appendParagraph('作成日：2026-03-05　　最終更新：2026-03-05')
    .setItalic(true).setFontSize(10).setForegroundColor('#666666');

  sep();

  // ─── 1. ツール概要 ───
  h1('1. ツール概要');
  table([
    ['項目', '内容'],
    ['名称',        'しんきゅうコンパス 集客フォローツール（KPI自動フォロー）'],
    ['公開URL',     'https://shinq-compass-cs.github.io/kpi-tool/'],
    ['サンプルURL', 'https://shinq-compass-cs.github.io/kpi-tool/sample.html'],
    ['リポジトリ',  'https://github.com/shinq-compass-cs/kpi-tool（パブリック）'],
    ['ホスティング','GitHub Pages（静的HTML）'],
    ['対象',        'しんきゅうコンパス有料会員 約1,100院'],
    ['目的',        'KPI達成状況を院長自身が確認・改善行動できるよう可視化する'],
  ]);
  sep();

  // ─── 2. システム構成 ───
  h1('2. システム構成');
  code(
    'ブラウザ（院長スマホ / PC）\n' +
    '    ↓  ログイン（サロンID + メールアドレス）\n' +
    'index.html（GitHub Pages 静的ホスティング）\n' +
    '    ↓  Google Sheets API v4（読み取り専用）\n' +
    'スプレッドシート（ID: 1CiuXRdYG-lI_jWA4DiR_uXvYU9dgqTE1v-JWsZF1l_g）\n' +
    '    ├── 2603（月次タブ・最新）\n' +
    '    ├── 2602（月次タブ）\n' +
    '    ├── 2601（月次タブ）\n' +
    '    └── 無料体験（常設タブ）'
  );
  bullet('認証: なし（静的HTML）。ログインはスプレッドシートのデータと照合するだけ');
  bullet('APIキー: リファラー制限済み（https://shinq-compass-cs.github.io/* のみ許可）');
  bullet('データ更新: CSチームがスプレッドシートを手動更新 → ツールは常に最新データを参照');
  sep();

  // ─── 3. データソース ───
  h1('3. データソース（スプレッドシート構造）');

  h2('月次タブ（例: 2603）');
  para('毎月新しいタブを追加。タブ名は YYMM 形式（例: 2603 = 2026年3月）。');
  table([
    ['列',  '項目名',                       '説明'],
    ['A',   'サロンID',                     'ログインキー'],
    ['B',   '院名',                         ''],
    ['C',   'メールアドレス',               'ログイン照合用'],
    ['D',   '検索順位エリア',               'エリアヒートマップ用'],
    ['L',   'アクセス数',                   '月次アクセス数'],
    ['W',   '口コミ件数',                   ''],
    ['X',   '口コミ返信件数',               ''],
    ['Y',   'PickUp口コミ',                 '0/1'],
    ['Z',   '口コミパーツ設置',             '0/1'],
    ['AA',  '予約公開利用院',               '0/1 または「公開」'],
    ['AB',  '予約GMB設置',                  '0/1'],
    ['AC',  '予約バナー設置',               '0/1'],
    ['AD',  'コンパス相互リンク設置',       '0/1'],
    ['AE',  '店舗PR情報登録',               '0/1'],
    ['AF',  'メニュー3件以上登録',          '0/1'],
    ['AG',  'メニュー連携',                 '0/1'],
    ['AJ',  'ゲスト予約利用',               '0/1'],
    ['AK',  '予約受付締切時間',             '分数（例: 60）'],
    ['…',   '検索優先ポイント / 掲載優先ポイント', '※列名が月によって異なる'],
    ['…',   'コンパス現在プラン',           'プラン名'],
    ['…',   '予約現在プラン',               'プラン名'],
  ]);
  note('列名は月次タブごとに微妙に異なる場合がある（例: 予約ボタンクリック数 vs クリック数）。コードは複数の列名を候補として持ち、前方一致で動的に解決する（parseRowDynamic 関数）。');

  h2('無料体験タブ（無料体験）');
  para('無料体験中の院を管理する常設タブ。');
  table([
    ['列', '項目名',       '説明'],
    ['F',  '有効期限日',   '何らかの値が入っていれば有効（空欄 = 無効）'],
    ['他', '月次タブと同様', 'ただし一部列が存在しない場合あり'],
  ]);
  sep();

  // ─── 4. ログイン仕様 ───
  h1('4. ログイン仕様');
  bullet('サロンID + メールアドレスを入力');
  bullet('最新月次タブ（monthlySheetName(0) で自動判定）を検索');
  bullet('見つからなければ無料体験タブを検索');
  bullet('見つからなければ「サロンIDが見つかりませんでした」エラー');
  bullet('メールアドレス照合（社内メアド info@shinq-compass.jp の場合はスキップ）');
  bullet('セッション保存（LocalStorage、有効期限あり）→ 次回アクセス時に自動ログイン');

  h2('月次タブの自動検出');
  code(
    'function monthlySheetName(offsetMonths) {\n' +
    '  const d = new Date();\n' +
    '  d.setDate(1);\n' +
    '  d.setMonth(d.getMonth() - offsetMonths);\n' +
    '  const yy = String(d.getFullYear()).slice(-2);\n' +
    '  const mm = String(d.getMonth() + 1).padStart(2, \'0\');\n' +
    '  return yy + mm;  // 例: \'2603\'\n' +
    '}'
  );
  para('毎月コード変更不要。スプレッドシートに新タブを追加するだけで自動対応。', true);
  sep();

  // ─── 5. KPI定義 ───
  h1('5. KPI定義');

  h2('ニーズ1: 検索で見つけてもらう 🔍');
  table([
    ['KPI名', '閾値', '種別', '検索ポイント付与'],
    ['アクセス数',           '200',    '数値',                    'なし'],
    ['店舗PR情報登録',       '達成/未達', 'フラグ',               '+100pt'],
    ['予約公開利用院',       '達成/未達', 'フラグ',               '+50pt'],
    ['予約GMB設置',          '達成/未達', 'フラグ',               '+50pt'],
    ['予約バナー設置',        '達成/未達', 'フラグ',               '+50pt'],
    ['コンパス相互リンク設置', '達成/未達', 'フラグ',              '+30pt'],
  ]);

  h2('ニーズ2: 予約ボタンを押してもらう 👆');
  table([
    ['KPI名', '閾値', '種別', '検索ポイント付与'],
    ['クリック数',         '20回',   '数値',                    'なし'],
    ['クリック率',         '10%',    '計算値（click/access×100）','なし'],
    ['口コミ件数',         '5件',    '数値',                    '1件ごと'],
    ['口コミ返信件数',     '5件',    '数値',                    '1件ごと'],
    ['PickUp口コミ',       '達成/未達', 'フラグ',               'なし'],
    ['口コミパーツ設置',   '達成/未達', 'フラグ',               '+30pt'],
    ['メニュー3件以上登録', '達成/未達', 'フラグ',              'なし'],
  ]);

  h2('ニーズ3: 実際に予約してもらう 📅');
  table([
    ['KPI名', '閾値', '種別', '検索ポイント付与'],
    ['予約数',           '2件',    '数値',                         'なし'],
    ['ネット予約率',      '10%',    '計算値（net_reserve/click×100）','なし'],
    ['メニュー連携',      '達成/未達', 'フラグ',                   'なし'],
    ['ゲスト予約利用',    '達成/未達', 'フラグ',                   'なし'],
    ['予約受付締切時間',  '60分前以上', '数値',                    'なし'],
  ]);
  sep();

  // ─── 6. 主要機能 ───
  h1('6. 主要機能');

  h2('6.1 ダッシュボード');
  bullet('院名・参照シート名・表示日時・契約プランをヘッダーに表示');
  bullet('プラチナPLUSプランの場合は予約リンクを常時表示');

  h2('6.2 努力目標バナー');
  para('未取得の検索ポイントを全て取得した場合の「到達可能エリア内順位」を表示。');
  code('検索優先ポイント 676pt にすれば、最大エリア内順位 2位 まで可能（あと +210pt 獲得可能）');
  bullet('背景: 白 / 左ボーダー: 赤4px / 文字: 濃赤');

  h2('6.3 KPI別達成状況');
  bullet('3ニーズ × 各指標を「達成 ✓ / 未達 ✗ / 未設定」で表示');
  bullet('未達の場合は具体的なアクションリンクを表示');
  bullet('各ニーズの達成率をプログレスバーで可視化');

  h2('6.4 エリア取り組み状況ヒートマップ');
  bullet('同じエリア内の全院の各KPI達成率を棒グラフで表示');
  bullet('データ収集: 最新月次タブ + 無料体験タブ（重複はサロンID優先で月次タブを採用）');
  bullet('自院の達成/未達を ● / ✗ でマーク');

  h2('6.5 口コミ投稿QRコード');
  bullet('しんきゅうコンパスの口コミ投稿ページへのQRコードを生成・表示・ダウンロード可能');

  h2('6.6 月次レポート推移（トレンドチャート）');
  bullet('アクセス数・クリック率・ネット予約率・口コミ件数の月次推移を折れ線グラフで表示');
  bullet('最大2年分（24ヶ月）、3連続でデータ不在なら打ち切り');
  bullet('データ収集は月次タブのみ（無料体験タブは参照しない）');

  h2('6.7 代行設置依頼フォーム');
  bullet('ホームページへのバナー・QRコード設置をCS側に依頼するためのモーダルフォーム');
  bullet('送信先: Google Apps Script → スプレッドシートに記録');

  h2('6.8 HP設置フォーム（Googleフォーム代行）');
  bullet('サロンID・院名を事前入力した状態のGoogleフォームURLを生成して開く');
  bullet('フォームID: 1FAIpQLSfzJ9bcUTeSO35VK3t-iyG_2UTZWCGJ84q0Ake2l_c7LNWmtQ');
  sep();

  // ─── 7. ファイル構成 ───
  h1('7. ファイル構成');
  code(
    'c:\\works\\kpi-tool\\\n' +
    '├── index.html          # 本番公開ファイル（GitHub Pages）\n' +
    '├── sample.html         # デモページ（salon 38290 自動表示、ログイン不要）\n' +
    '├── delegate.html       # 代行設置依頼フォームページ\n' +
    '├── kpi-tool.html       # ローカル確認用\n' +
    '├── spec.md             # 本仕様書（Markdown原本）\n' +
    '├── CLAUDE.md           # Claude Code 開発ガイドライン\n' +
    '├── create-form.gs      # Googleフォーム生成スクリプト\n' +
    '└── log-sheet.gs        # ログ記録スクリプト'
  );
  sep();

  // ─── 8. 月次運用手順 ───
  h1('8. 月次運用手順');
  bullet('毎月初め、スプレッドシートに新しいタブを YYMM 形式で追加（例: 2604）');
  bullet('前月タブのデータをコピーし、新月のデータに更新');
  para('コード変更不要 — ツールは自動で最新月次タブを参照する', true);
  sep();

  // ─── 9. セキュリティ ───
  h1('9. セキュリティ・アクセス制限');
  table([
    ['項目', '内容'],
    ['Google APIキー',  'リファラー制限（https://shinq-compass-cs.github.io/* のみ）'],
    ['ログイン認証',    'サロンID + メールアドレスの照合（サーバーレス）'],
    ['SEOクロール',     '全HTMLに <meta name="robots" content="noindex, nofollow"> 設置済み'],
    ['セッション',      'LocalStorage に保存（タイムアウトあり）'],
    ['社内アクセス',    'info@shinq-compass.jp でログインするとメール照合スキップ（CS用）'],
  ]);
  sep();

  // ─── 10. 既知の仕様・注意点 ───
  h1('10. 既知の仕様・注意点');
  bullet('無料体験タブの院: 月次タブに存在しないため store_pr などのデータが null になる列がある → 「未設定」表示は正常動作');
  bullet('列名の揺れ: 月次タブにより列名が変わる（例: 掲載優先ポイント vs 検索優先ポイント）→ parseRowDynamic で複数候補を持って対応');
  bullet('エリアヒートマップ: 最新月次 + 無料体験タブの両方からエリア内院データを収集。同一サロンIDは月次タブ優先');
  sep();

  // ─── 11. 関連リンク ───
  h1('11. 関連リンク');
  table([
    ['名称', 'URL'],
    ['公開URL',         'https://shinq-compass-cs.github.io/kpi-tool/'],
    ['サンプルページ',  'https://shinq-compass-cs.github.io/kpi-tool/sample.html'],
    ['GitHubリポジトリ','https://github.com/shinq-compass-cs/kpi-tool'],
    ['スプレッドシート','https://docs.google.com/spreadsheets/d/1CiuXRdYG-lI_jWA4DiR_uXvYU9dgqTE1v-JWsZF1l_g'],
    ['LINE',            'https://line.me/ti/p/@348cwzis'],
  ]);

  // ===== 保存・完了 =====
  doc.saveAndClose();
  Logger.log('✅ 作成完了: ' + doc.getUrl());
}
