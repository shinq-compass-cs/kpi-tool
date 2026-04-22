/**
 * しんきゅうコンパス ホームページ代行設定 依頼フォーム 自動生成スクリプト v3
 *
 * 【使い方】
 * 1. https://script.google.com にアクセス（Googleアカウントでログイン）
 * 2. 「新しいプロジェクト」を作成
 * 3. このコードを貼り付けて保存
 * 4. 上部の関数名が「createForm」になっているか確認して ▶ 実行
 * 5. 「表示」→「ログ」でIDを確認してコピー
 */
function createForm() {
  var form = FormApp.create('代行設定 依頼フォーム【しんきゅうコンパス】');

  form.setDescription(
    '代行設定のご依頼ありがとうございます。\n' +
    '以下の内容をご入力のうえ、送信してください。\n' +
    '担当者より3営業日以内にご連絡いたします。'
  );
  form.setConfirmationMessage(
    'ご依頼を受け付けました。\n担当者より3営業日以内にご連絡いたします。\nしんきゅうコンパス カスタマーサポート'
  );
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);

  // ── フォーム概要（最初に表示） ──────────────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('このフォームでできること')
    .setHelpText(
      '【1】ホームページへの代行設置\n' +
      '　予約バナー・相互リンク・口コミパーツを貴院のHPに設置します\n\n' +
      '【2】Google ビジネスプロフィール（GBP）への代行設置\n' +
      '　しんきゅう予約の予約URLをGBPに設置します\n\n' +
      'どちらか一方のみのご依頼も可能です。'
    );

  // ── 自動入力項目（集客フォローツールから自動入力される） ──────────
  var qId = form.addTextItem();
  qId.setTitle('サロンID').setRequired(true)
    .setHelpText('※自動入力されますので、そのままで「次へ」を押してください');

  var qName = form.addTextItem();
  qName.setTitle('院名').setRequired(true)
    .setHelpText('※自動入力されますので、そのままで「次へ」を押してください');

  // ══════════════════════════════════════════════════════════
  //  セクション1: ホームページへの代行設置
  // ══════════════════════════════════════════════════════════
  form.addPageBreakItem()
    .setTitle('【1】ホームページへの代行設置')
    .setHelpText(
      '集客を最大化する設定を、貴院のホームページに代行設置します。\n' +
      'ホームページの管理画面ログイン情報をご用意のうえご入力ください。'
    );

  var qHpType = form.addCheckboxItem();
  qHpType.setTitle('掲載依頼する対象をすべて選択してください')
    .setRequired(true)
    .setChoices([
      qHpType.createChoice('しんきゅう予約へのバナー（予約リンク）を設置してほしい　★50pt'),
      qHpType.createChoice('しんきゅうコンパスのバナー（相互リンク）を設置してほしい　★30pt'),
      qHpType.createChoice('口コミパーツを埋め込んでほしい　★30pt'),
    ]);

  var qPos = form.addMultipleChoiceItem();
  qPos.setTitle('ホームページへの掲載位置について')
    .setRequired(true)
    .setChoices([
      qPos.createChoice('集客が最大化する形で一任する'),
      qPos.createChoice('トップページの一番下の辺りにまとめる'),
      qPos.createChoice('指定する'),
    ]);

  var qPosDetail = form.addParagraphTextItem();
  qPosDetail.setTitle('掲載位置の詳細（「指定する」を選択した場合のみご記入ください）')
    .setHelpText('例：トップページのスタッフ紹介セクションの下に設置してほしい');

  form.addSectionHeaderItem()
    .setTitle('ホームページのログイン情報')
    .setHelpText('代行設定に必要な情報です。SSL暗号化通信にて厳重に管理いたします。');

  var qHpUrl = form.addTextItem();
  qHpUrl.setTitle('ホームページのURL（公開URL）').setRequired(true)
    .setHelpText('例：https://www.example.com');

  var qAdminUrl = form.addTextItem();
  qAdminUrl.setTitle('管理画面のログインページURL')
    .setHelpText('例：https://www.example.com/wp-admin');

  var qLoginId = form.addTextItem();
  qLoginId.setTitle('ログインID（ユーザー名）').setRequired(true);

  var qLoginPw = form.addTextItem();
  qLoginPw.setTitle('ログインパスワード').setRequired(true);

  // ══════════════════════════════════════════════════════════
  //  セクション2: GBP への代行設置
  // ══════════════════════════════════════════════════════════
  form.addPageBreakItem()
    .setTitle('【2】Google ビジネスプロフィール（GBP）への代行設置')
    .setHelpText(
      'Googleマップ・Google検索に表示されるビジネスプロフィールへ、しんきゅう予約の予約URLを設置します。\n\n' +
      '【代行設定の方法について】\n' +
      '当社からGoogleビジネスプロフィールの管理権限をリクエストします。\n' +
      'Googleからリクエスト通知が届きましたら「承認」を押してください。\n' +
      '承認後、担当者が設定を完了しご連絡いたします。'
    );

  var qGbp = form.addMultipleChoiceItem();
  qGbp.setTitle('GBPへの予約リンク設置を依頼しますか？')
    .setRequired(true)
    .setChoices([
      qGbp.createChoice('依頼する'),
      qGbp.createChoice('依頼しない'),
    ]);

  var qGbpUrl = form.addTextItem();
  qGbpUrl.setTitle('GBPのURL')
    .setHelpText(
      '「依頼する」を選択した場合のみご記入ください。\n' +
      '【取得方法】Googleマップで自院を検索 → 画面のURLをそのままコピー'
    );

  // ── エントリーID取得（pre-fill用） ──────────────────────────────
  var items = form.getItems();
  var idEntryId = -1, nameEntryId = -1;
  for (var i = 0; i < items.length; i++) {
    var t = items[i].getTitle();
    if (t === 'サロンID') idEntryId   = items[i].getId();
    if (t === '院名')    nameEntryId = items[i].getId();
  }

  var formId  = form.getId();
  var pubUrl  = form.getPublishedUrl();
  var hashMatch = pubUrl.match(/forms\/d\/e\/([^\/\?]+)/);
  var hashId  = hashMatch ? hashMatch[1] : 'NOT_FOUND';

  // ── ログ出力 ──────────────────────────────────────────────────────
  Logger.log('======================================');
  Logger.log('  フォーム作成完了！');
  Logger.log('======================================');
  Logger.log('公開URL    : ' + pubUrl);
  Logger.log('編集URL    : ' + form.getEditUrl());
  Logger.log('');
  Logger.log('【集客フォローツールに設定する値（以下を全部コピーして渡す）】');
  Logger.log('PUBLISHED_URL='    + pubUrl);
  Logger.log('FILE_ID='          + formId);
  Logger.log('HASH_ID='          + hashId);
  Logger.log('SALON_ID_ENTRY='   + idEntryId);
  Logger.log('NAME_ENTRY='       + nameEntryId);
}
