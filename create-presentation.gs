/**
 * プラチナPLUS販売戦略プレゼンテーション生成スクリプト
 * 実行: createPlatinumPlusPresentation()
 */

function createPlatinumPlusPresentation() {
  // 既存プレゼンテーションを上書き
  const PRESENTATION_ID = '1Vx0AJQiac7w6Ync2LE14QM6rSuHiI2YLLAeJnn5nNp0';
  const presentation = SlidesApp.openById(PRESENTATION_ID);

  // 既存スライドをすべて削除
  const existingSlides = presentation.getSlides();
  existingSlides.forEach(s => s.remove());

  // タイトルを更新
  presentation.setName('プラチナPLUS販売戦略（経営層向け）2026年3月');

  // ===== カラーパレット =====
  const COLOR = {
    navy:    '#1a2744',
    gold:    '#c9a84c',
    white:   '#ffffff',
    light:   '#f5f7fa',
    accent:  '#e8f0fe',
    red:     '#c0392b',
    green:   '#1e8449',
    gray:    '#555555',
    lgray:   '#aaaaaa',
    border:  '#dde3ed',
  };

  // ===== ヘルパー関数 =====
  function addSlide(layout) {
    return presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  }

  function setBackground(slide, color) {
    slide.getBackground().setSolidFill(color);
  }

  function addRect(slide, x, y, w, h, fillColor, strokeColor) {
    const shape = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
    if (fillColor) shape.getFill().setSolidFill(fillColor);
    else shape.getFill().setTransparent();
    if (strokeColor) {
      shape.getBorder().getLineFill().setSolidFill(strokeColor);
      shape.getBorder().setWeight(1);
    } else {
      shape.getBorder().setTransparent();
    }
    return shape;
  }

  function addText(slide, text, x, y, w, h, opts) {
    const shape = slide.insertTextBox(text, x, y, w, h);
    const style = shape.getText().getTextStyle();
    const para = shape.getText().getParagraphStyle();
    shape.getFill().setTransparent();
    shape.getBorder().setTransparent();
    if (opts.size)   style.setFontSize(opts.size);
    if (opts.bold)   style.setBold(true);
    if (opts.color)  style.setForegroundColor(opts.color);
    if (opts.font)   style.setFontFamily(opts.font);
    if (opts.align)  para.setParagraphAlignment(
      opts.align === 'center' ? SlidesApp.ParagraphAlignment.CENTER :
      opts.align === 'right'  ? SlidesApp.ParagraphAlignment.END :
                                SlidesApp.ParagraphAlignment.START
    );
    return shape;
  }

  // スライド幅・高さ（pt: 720x405）
  const W = 720, H = 405;

  // ===== スライド共通ヘッダー =====
  function addHeader(slide, title, slideNum, total, badge) {
    // 上部ネイビーバー
    addRect(slide, 0, 0, W, 52, COLOR.navy, null);
    // ゴールドアクセントライン
    addRect(slide, 0, 52, W, 3, COLOR.gold, null);
    // タイトル（全幅使用）
    addText(slide, title, 20, 8, 640, 38, { size: 20, bold: true, color: COLOR.white });
    // ロゴ代替テキスト（右上）
    addText(slide, 'しんきゅうコンパス', 510, 12, 140, 28, { size: 9, color: '#7799cc', align: 'right' });
    // ページ番号（右下余白）
    addRect(slide, 0, H - 22, W, 22, '#e8ecf2', null);
    addText(slide, `${slideNum} / ${total}`, 620, H - 20, 88, 18, { size: 9, color: COLOR.gray, align: 'right' });
    // 施策バッジ（オプション）
    if (badge) {
      const bc = badge === 'A' ? '#1e8449' : badge === 'B' ? '#c9a84c' : '#c0392b';
      addRect(slide, 660, 6, 52, 40, bc, null);
      addText(slide, '施策' + badge, 660, 10, 52, 32, { size: 14, bold: true, color: COLOR.white, align: 'center' });
    }
  }

  const TOTAL = 12;

  // ========================================
  // スライド 1: タイトル
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.navy);
    // 背景装飾
    addRect(s, 0, 0, 6, H, COLOR.gold, null);
    addRect(s, 6, 0, 3, H, '#b8963e', null);
    // サブタイトル背景
    addRect(s, 40, 120, 640, 180, null, null);
    // メインタイトル
    addText(s, 'プラチナPLUS', 40, 80, 640, 70, { size: 52, bold: true, color: COLOR.gold, align: 'center' });
    addText(s, '販売戦略', 40, 148, 640, 60, { size: 44, bold: true, color: COLOR.white, align: 'center' });
    // 装飾ライン
    addRect(s, 200, 215, 320, 2, COLOR.gold, null);
    // サブテキスト
    addText(s, '経営層向け戦略説明資料', 40, 228, 640, 32, { size: 16, color: '#aaccff', align: 'center' });
    addText(s, '2026年3月　カスタマーサクセス部', 40, 265, 640, 28, { size: 13, color: COLOR.lgray, align: 'center' });
    // 下部装飾
    addRect(s, 0, H - 4, W, 4, COLOR.gold, null);
  }

  // ========================================
  // スライド 2: アジェンダ
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, 'AGENDA', 2, TOTAL);

    const items = [
      ['①', '現状の数値', '無料体験有料化率（2025年7月〜12月）'],
      ['②', '課題整理',   '定量・定性の両面から'],
      ['③', '目標 KPI',   '有料化率・予約導線系の数値目標'],
      ['④', '実行計画',   '定量施策 / プラチナPLUS販促 / マインドブロック解除'],
      ['⑤', '【議論】',   '商品定義：しんきゅうコンパスとは？'],
    ];

    items.forEach(([num, title, sub], i) => {
      const y = 75 + i * 60;
      addRect(s, 30, y, 660, 52, COLOR.white, COLOR.border);
      addRect(s, 30, y, 6, 52, i === 3 ? COLOR.gold : COLOR.navy, null);
      addText(s, num, 44, y + 8, 40, 36, { size: 18, bold: true, color: i === 3 ? COLOR.gold : COLOR.navy });
      addText(s, title, 90, y + 6, 200, 24, { size: 14, bold: true, color: COLOR.navy });
      addText(s, sub,   90, y + 28, 580, 20, { size: 10, color: COLOR.gray });
    });
  }

  // ========================================
  // スライド 3: ① 現状の数値
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '① 現状の数値｜無料体験有料化率', 3, TOTAL);

    // 2列レイアウト
    // 左：最新（2025年10〜12月）
    addRect(s, 20, 68, 330, 310, COLOR.white, COLOR.border);
    addRect(s, 20, 68, 330, 32, COLOR.navy, null);
    addText(s, '直近（2025年10〜12月 3ヵ月平均）', 28, 73, 314, 22, { size: 11, bold: true, color: COLOR.white });

    const currentData = [
      ['コンパス単体', '54.46%', '（61 / 112）', COLOR.navy],
      ['うちプラチナPLUS', '8.04%', '（9 / 112）', COLOR.red],
      ['予約単体', '23.21%', '（26 / 112）', '#e67e22'],
    ];
    currentData.forEach(([label, pct, detail, color], i) => {
      const y = 112 + i * 82;
      addText(s, label, 30, y, 200, 22, { size: 11, color: COLOR.gray });
      addText(s, pct, 30, y + 22, 200, 36, { size: 28, bold: true, color: color });
      addText(s, detail, 30, y + 56, 200, 18, { size: 9, color: COLOR.lgray });
    });

    // 右：過去（2025年7〜9月）
    addRect(s, 368, 68, 330, 210, COLOR.white, COLOR.border);
    addRect(s, 368, 68, 330, 32, '#3d5a99', null);
    addText(s, '前期（2025年7〜9月 3ヵ月平均）', 376, 73, 314, 22, { size: 11, bold: true, color: COLOR.white });

    const pastData = [
      ['コンパス単体', '65.77%', '（73 / 111）'],
      ['予約単体', '37.80%', '（31 / 82）'],
    ];
    pastData.forEach(([label, pct, detail], i) => {
      const y = 112 + i * 80;
      addText(s, label, 378, y, 200, 22, { size: 11, color: COLOR.gray });
      addText(s, pct, 378, y + 20, 200, 34, { size: 26, bold: true, color: '#3d5a99' });
      addText(s, detail, 378, y + 52, 200, 18, { size: 9, color: COLOR.lgray });
    });

    // 右下：ポイント
    addRect(s, 368, 290, 330, 88, '#fff8e8', '#c9a84c');
    addText(s, '⚠ 注目ポイント', 380, 295, 300, 20, { size: 10, bold: true, color: '#7d5a00' });
    addText(s, 'プラチナPLUSの有料化率 8.04% は\n直近3ヵ月でも最重要改善ポイント', 380, 314, 306, 58, { size: 10, color: '#5a3c00' });
  }

  // ========================================
  // スライド 4: ② 課題（定量）
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '② 課題整理｜定量：KPIは改善している', 4, TOTAL);

    // テーブルヘッダー
    addRect(s, 20, 58, 680, 26, COLOR.navy, null);
    const colX = [20, 210, 380, 550];
    const colW = [190, 170, 170, 150];
    const colLabels = ['KPI指標', '前期（7〜9月）', '直近（10〜12月）', '増減'];
    colLabels.forEach((label, i) => {
      addText(s, label, colX[i] + 4, 60, colW[i] - 6, 22, { size: 10, bold: true, color: COLOR.white, align: i === 0 ? 'left' : 'center' });
    });

    // テーブル行
    const rows = [
      { label: '予約導線系平均', prev: '45.31%', curr: '50.61%', diff: '▲ +5.30pt', diffColor: COLOR.green },
      { label: '予約設定系平均', prev: 'データなし', curr: '75.74%', diff: '★新規', diffColor: COLOR.gold },
      { label: '口コミ系平均',   prev: '24.69%', curr: '34.47%', diff: '▲ +9.78pt', diffColor: COLOR.green },
    ];
    rows.forEach((r, i) => {
      const y = 84 + i * 56;
      const bg = i % 2 === 0 ? COLOR.white : '#f0f4ff';
      addRect(s, 20, y, 680, 56, bg, COLOR.border);
      addRect(s, 20, y, 4, 56, COLOR.navy, null);
      addText(s, r.label, colX[0] + 10, y + 8, colW[0] - 14, 40, { size: 12, bold: true, color: COLOR.navy });
      addText(s, r.prev, colX[1], y + 12, colW[1], 32, { size: i === 1 ? 10 : 18, bold: i !== 1, color: '#3d5a99', align: 'center' });
      addText(s, r.curr, colX[2], y + 12, colW[2], 32, { size: 20, bold: true, color: COLOR.navy, align: 'center' });
      addText(s, r.diff, colX[3], y + 12, colW[3], 32, { size: 13, bold: true, color: r.diffColor, align: 'center' });
    });

    // 考察ボックス
    addRect(s, 20, 256, 680, 116, '#fff8e8', '#c9a84c');
    addRect(s, 20, 256, 680, 22, '#c9a84c', null);
    addText(s, '考察', 28, 259, 300, 18, { size: 10, bold: true, color: COLOR.navy });
    addText(s,
      '・KPIは全指標で改善しているが、有料化率は低い\n' +
      '　→ KPI以外の定性部分（商品説明・価格感・提案順序）に課題があると推察\n\n' +
      '・当KPIは実績値（後述：1年半継続有料院 77.78%）に比べるとまだ低い\n' +
      '　→ 目標は実績値を根拠に設定（詳細はスライド③参照）',
      28, 280, 660, 88, { size: 10, color: '#5a3c00' });
  }

  // ========================================
  // スライド 5: ② 課題（定性）
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '② 課題整理｜定性：商品変更の影響', 5, TOTAL);

    const issues = [
      {
        tag: '対応不要', tagColor: COLOR.gray,
        title: 'フォロー期間短縮・同時クロージングの必要性',
        body: '予約の無料体験開始タイミングがコンパスと同時になり、\nフォロー期間が実質 30〜90日→60日に短縮。\n→ 成果を出しているメンバーの手法を横展開することで対応',
      },
      {
        tag: '要対応', tagColor: COLOR.red,
        title: 'カウント・課金サイクル変更・自動課金の不具合',
        body: '予約のカウントサイクル・課金サイクルが変更。自動課金が機能しないケースあり。\nコンパス（集客）と予約（リピート・予約ツール）を別々に説明している。\n→ プラチナPLUSを販促することで一括解消を図る',
      },
      {
        tag: '要対応', tagColor: COLOR.red,
        title: '総額コスト増加によるマインドブロック',
        body: '商品刷新により院側の総額コストが上昇。\n有料化のハードルになっている可能性。\n→ 商品価値の再定義とコスパ訴求でマインドブロックを外す',
      },
    ];

    issues.forEach((item, i) => {
      const y = 68 + i * 108;
      addRect(s, 20, y, 680, 100, COLOR.white, COLOR.border);
      addRect(s, 20, y, 4, 100, item.tagColor, null);
      // タグ
      addRect(s, 32, y + 10, 60, 20, item.tagColor, null);
      addText(s, item.tag, 32, y + 11, 60, 18, { size: 9, bold: true, color: COLOR.white, align: 'center' });
      // タイトル
      addText(s, item.title, 100, y + 8, 590, 24, { size: 12, bold: true, color: COLOR.navy });
      // 本文
      addText(s, item.body, 32, y + 36, 660, 58, { size: 9, color: COLOR.gray });
    });
  }

  // ========================================
  // スライド 6: ② 対策まとめ（A / B / C）
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '② 対策まとめ｜課題解消の3つのアプローチ', 6, TOTAL);

    // 前置きテキスト
    addRect(s, 20, 58, 680, 24, '#e8f0fe', '#3d5a99');
    addText(s, '定量・定性の課題を以下3施策で解消する。スライド④以降は各施策の詳細を示す。', 28, 62, 660, 18, { size: 9, color: '#2a4099' });

    const strategies = [
      {
        badge: 'A', color: '#1e8449', light: '#e9f7ef', border: '#1e8449',
        title: 'KPI改善',
        sub: '引き続き数値を上げる',
        body: '・KPIツールで院にログインさせる\n・自動アドバイスツールを毎回使用\n・代行設置フォームで設置ハードルを下げる',
      },
      {
        badge: 'B', color: '#c9a84c', light: '#fff8e8', border: '#c9a84c',
        title: 'プラチナPLUS販促',
        sub: '一体型商品として提案する',
        body: '・課金サイクル変更・自動課金問題を解消\n・コンパス＋予約を「一体型」として訴求\n・年間払いを最初に提示する',
      },
      {
        badge: 'C', color: '#c0392b', light: '#fdecea', border: '#c0392b',
        title: 'マインドブロック解除',
        sub: '価格上昇への対処',
        body: '・19,800円で20,000円超の価値を訴求\n・「高い商品ではなく最高コスパ」の\n　営業マインドをCSに浸透させる',
      },
    ];

    strategies.forEach((st, i) => {
      const x = 20 + i * 228;
      // カード
      addRect(s, x, 88, 222, 278, st.light, st.border);
      addRect(s, x, 88, 222, 4, st.color, null);
      // バッジ
      addRect(s, x + 86, 100, 50, 50, st.color, null);
      addText(s, st.badge, x + 86, 104, 50, 42, { size: 30, bold: true, color: COLOR.white, align: 'center' });
      // タイトル
      addText(s, st.title, x + 8, 158, 206, 28, { size: 16, bold: true, color: st.color, align: 'center' });
      addText(s, st.sub, x + 8, 184, 206, 22, { size: 10, color: COLOR.gray, align: 'center' });
      // 区切り線
      addRect(s, x + 20, 208, 182, 1, st.border, null);
      // 本文
      addText(s, st.body, x + 12, 214, 202, 88, { size: 9, color: COLOR.gray });
    });
  }

  // ========================================
  // スライド 7: ③ 目標KPI
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '③ 目標 KPI', 7, TOTAL);

    // 上段：有料化率
    addRect(s, 20, 66, 680, 24, COLOR.navy, null);
    addText(s, '無料体験有料化率の目標', 28, 69, 660, 18, { size: 11, bold: true, color: COLOR.white });

    const kpiRows = [
      ['コンパス単体', '54.46%', '→', '80.00%'],
      ['うちプラチナPLUS', '8.04%', '→', '40.00%'],
      ['予約単体', '23.21%', '→', '50.00%'],
    ];
    kpiRows.forEach(([label, curr, arrow, goal], i) => {
      const x = 20 + i * 228;
      addRect(s, x, 92, 222, 100, COLOR.white, COLOR.border);
      addText(s, label, x + 8, 96, 206, 22, { size: 10, color: COLOR.gray });
      addText(s, curr, x + 8, 116, 100, 30, { size: 20, bold: true, color: i === 1 ? COLOR.red : '#3d5a99' });
      addText(s, arrow, x + 108, 122, 24, 22, { size: 16, color: COLOR.lgray, align: 'center' });
      addText(s, goal, x + 128, 116, 86, 30, { size: 20, bold: true, color: COLOR.green });
      addText(s, '目標', x + 128, 148, 86, 18, { size: 9, color: COLOR.lgray });
    });

    // 中段：KPI
    addRect(s, 20, 204, 680, 24, '#3d5a99', null);
    addText(s, 'KPI 目標', 28, 207, 660, 18, { size: 11, bold: true, color: COLOR.white });

    const kpiItems = [
      ['予約導線系平均', '50.61%', '→', '80.00%', '現状比 +29.39pt'],
      ['予約設定系平均', '75.74%', '→', '90.00%', '★新規 KPI 追加'],
    ];
    kpiItems.forEach(([label, curr, arrow, goal, note], i) => {
      const x = 20 + i * 344;
      addRect(s, x, 230, 338, 90, COLOR.white, COLOR.border);
      addText(s, label, x + 8, 234, 320, 22, { size: 11, bold: true, color: COLOR.navy });
      addText(s, curr, x + 8, 255, 120, 32, { size: 22, bold: true, color: '#3d5a99' });
      addText(s, arrow, x + 128, 260, 24, 22, { size: 16, color: COLOR.lgray, align: 'center' });
      addText(s, goal, x + 152, 255, 100, 32, { size: 22, bold: true, color: COLOR.green });
      addText(s, note, x + 8, 292, 316, 20, { size: 9, color: COLOR.gold, bold: true });
    });

    // 下段：参考データ
    addRect(s, 20, 332, 680, 58, '#fff8e8', '#c9a84c');
    addText(s, '参考：過去最高実績（2024年8〜10月）', 30, 336, 400, 18, { size: 10, bold: true, color: '#7d5a00' });
    addText(s,
      'コンパス単体 81.13%（86/106）　予約単体 45.61%（26/57）　予約導線系 53.81%\n' +
      '1年半継続有料院のみ → 予約導線系 77.78%　←目標値設定の根拠',
      30, 354, 660, 32, { size: 9, color: '#5a3c00' });
  }

  // ========================================
  // スライド 8: ④ 実行計画（定量・ツール活用）[施策A]
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '④ 実行計画｜施策A：KPIを上げる', 8, TOTAL, 'A');

    const actions = [
      {
        icon: '📊', title: 'KPIツール活用',
        body: 'フォロー時に鍼灸院に必ずログインしてもらうことを徹底\n数値を可視化し、改善ポイントを院とともに確認する',
      },
      {
        icon: '🤖', title: '自動アドバイスツール',
        body: 'CSフォロー時に自動アドバイスツールを必ず使用\nAIによる改善提案でフォローの質と効率を同時に向上',
      },
      {
        icon: '📋', title: '代行設置依頼フォームの活用',
        body: '予約ボタン設置・問診票設定などを院の代わりに実施\n設置ハードルを下げ、予約機能の利用開始を促進',
      },
    ];

    actions.forEach((a, i) => {
      const y = 70 + i * 106;
      addRect(s, 20, y, 680, 96, COLOR.white, COLOR.border);
      addRect(s, 20, y, 4, 96, COLOR.navy, null);
      // アイコン
      addText(s, a.icon, 32, y + 18, 50, 50, { size: 28, align: 'center' });
      // タイトル
      addText(s, a.title, 90, y + 10, 590, 28, { size: 14, bold: true, color: COLOR.navy });
      // 本文
      addText(s, a.body, 90, y + 38, 590, 52, { size: 10, color: COLOR.gray });
    });
  }

  // ========================================
  // スライド 9: ④ 実行計画（プラチナPLUS販促）[施策B]
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '④ 実行計画｜施策B：プラチナPLUSを販促する', 9, TOTAL, 'B');

    // 販促の目的
    addRect(s, 20, 66, 680, 32, COLOR.gold, null);
    addText(s, '課題の一括解消手段としてプラチナPLUSを最優先で提案する', 28, 72, 660, 22, { size: 12, bold: true, color: COLOR.navy });

    // 解消される課題3点
    const solves = [
      ['課金サイクル変更', 'プラチナPLUSに一本化することでカウント・課金の複雑さが解消'],
      ['コンパス＋予約を別々に説明', '「集客からカルテまで一体型」として一つの商品として訴求できる'],
      ['自動課金の不具合', '年間払いへ誘導することで自動課金の問題を回避できる'],
    ];
    solves.forEach(([title, body], i) => {
      const y = 112 + i * 72;
      addRect(s, 20, y, 680, 62, COLOR.white, COLOR.border);
      addRect(s, 20, y, 4, 62, COLOR.gold, null);
      addRect(s, 32, y + 10, 60, 20, COLOR.gold, null);
      addText(s, '解消', 32, y + 11, 60, 18, { size: 9, bold: true, color: COLOR.navy, align: 'center' });
      addText(s, title, 102, y + 8, 300, 22, { size: 12, bold: true, color: COLOR.navy });
      addText(s, body, 102, y + 30, 580, 26, { size: 10, color: COLOR.gray });
    });

    // 商品定義（仮案）
    addRect(s, 20, 334, 680, 56, '#fff8e8', '#c9a84c');
    addText(s, '商品定義（仮案）', 30, 338, 200, 20, { size: 10, bold: true, color: '#7d5a00' });
    addText(s,
      '鍼灸院向けオンライン集客・顧客管理ツールの決定版\n' +
      '新規集客 ＋ 口コミ ＋ AI検索対応 ／ 予約ツール ＋ 顧客管理 ＋ 事前問診 ＋ 電子カルテ\n' +
      '＊詳細は【議論】スライドで決定',
      30, 356, 660, 30, { size: 9, color: '#5a3c00' });
  }

  // ========================================
  // スライド 10: ④ 実行計画（マインドブロック解除）[施策C]
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '④ 実行計画｜施策C：マインドブロック解除', 10, TOTAL, 'C');

    // 上部：前提
    addRect(s, 20, 66, 680, 28, '#fdecea', '#c0392b');
    addText(s, '課題：商品刷新により院側の総額コストが上昇 → 有料化のハードルになっている', 28, 71, 660, 20, { size: 10, bold: true, color: COLOR.red });

    // メイン：コスパ訴求
    addRect(s, 20, 104, 680, 32, COLOR.navy, null);
    addText(s, 'おすすめプラン：プラチナPLUS　年間払い　19,800円/月 で訴求', 28, 110, 660, 22, { size: 12, bold: true, color: COLOR.white });

    // コスト内訳カード（横並び3枚）
    const cards = [
      { title: '新規集客', value: '10,000円', sub: '平均2件 × CPA 5,000円', color: COLOR.navy },
      { title: '予約管理＋問診\n＋電子カルテ', value: '10,000円', sub: '同等機能の相場', color: '#3d5a99' },
      { title: '合計価値', value: '20,000円+', sub: '月あたり', color: COLOR.green },
    ];
    cards.forEach((c, i) => {
      const x = 20 + i * 228;
      addRect(s, x, 148, 222, 110, COLOR.white, COLOR.border);
      addRect(s, x, 148, 222, 4, c.color, null);
      addText(s, c.title, x + 10, 158, 202, 36, { size: 11, bold: true, color: COLOR.navy });
      addText(s, c.value, x + 10, 196, 202, 36, { size: 24, bold: true, color: c.color });
      addText(s, c.sub, x + 10, 234, 202, 20, { size: 9, color: COLOR.lgray });
    });

    // 矢印・結論
    addRect(s, 20, 272, 680, 58, '#e9f7ef', '#1e8449');
    addText(s, '→ 19,800円で 20,000円以上の価値を提供', 30, 278, 660, 26, { size: 14, bold: true, color: COLOR.green });
    addText(s, 'コスパ訴求で「高い」というマインドブロックを外し、クロージングのハードルを下げる', 30, 304, 660, 22, { size: 10, color: '#1a5c35' });

    // 営業マインド
    addRect(s, 20, 342, 680, 50, '#e8f0fe', '#3d5a99');
    addText(s, '営業マインドのインストール', 30, 346, 300, 20, { size: 10, bold: true, color: '#2a4099' });
    addText(s,
      '「プラチナPLUSは"高い商品"ではなく、院の経営課題を丸ごと解決するコスパ最高の選択肢」\nとして、自信を持って提案する姿勢を全CSメンバーに浸透させる',
      30, 364, 660, 26, { size: 9, color: '#2a4099' });
  }

  // ========================================
  // スライド 11: 【議論】商品定義 [施策B]
  // ========================================
  {
    const s = addSlide();
    setBackground(s, '#f0f4ff');
    addHeader(s, '【議論】商品定義：しんきゅうコンパスとは？', 11, TOTAL, 'B');

    // 議論ラベル
    addRect(s, 20, 60, 680, 28, '#e8f0fe', '#3d5a99');
    addText(s,
      '下記の候補から商品定義を決定する。定義は販促・営業トーク・コンテンツ全体に統一して使用する。',
      28, 64, 660, 20, { size: 9, color: '#2a4099' });

    const candidates = [
      { text: '鍼灸院特化のオンライン集客・予約・顧客管理ツールの決定版', tag: '機能網羅型' },
      { text: '鍼灸院集客と顧客管理のメインプラットフォーム', tag: 'シンプル型' },
      { text: '鍼灸院の安定経営を支えるオンライン・パートナー', tag: '価値訴求型' },
      { text: '集客からカルテまで、院のフローに役立つオンラインツール', tag: 'フロー型' },
      { text: '先生が治療に専念できる環境を拓くDXプラットフォーム', tag: 'ビジョン型' },
      { text: '新規集客とリピートUPを実現する、鍼灸院専用の経営プラットフォーム', tag: '成果訴求型' },
    ];

    candidates.forEach((c, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = 20 + col * 350;
      const y = 96 + row * 88;
      addRect(s, x, y, 340, 80, COLOR.white, COLOR.border);
      addRect(s, x, y, 4, 80, COLOR.navy, null);
      // タグ
      addRect(s, x + 10, y + 8, 70, 18, '#e8f0fe', null);
      addText(s, c.tag, x + 10, y + 9, 70, 16, { size: 8, color: '#2a4099', align: 'center' });
      // テキスト
      addText(s, c.text, x + 10, y + 30, 320, 44, { size: 10, color: COLOR.navy });
    });

    // 判断軸ボックス
    addRect(s, 20, 362, 680, 34, '#fff8e8', '#c9a84c');
    addText(s,
      '判断軸: ①ターゲット（鍼灸院/患者）②価値（集客/リピート/単価UP）③機能（ポータル/口コミ/予約/顧客管理/カルテ/問診）④サービス種別（ツール/パートナー/PF）',
      28, 366, 660, 26, { size: 8, color: '#7d5a00' });
  }

  // ========================================
  // スライド 12: ④ 実行計画（具体的な施策）
  // ========================================
  {
    const s = addSlide();
    setBackground(s, COLOR.light);
    addHeader(s, '④ 実行計画｜施策B：プラチナPLUS販促の具体的施策', 12, TOTAL, 'B');

    // 施策リスト（左カラム・右カラム 2列4段）
    const measures = [
      { phase: '準備', title: '全CS向け商品定義共有',       body: '決定定義を全員に浸透。「コンパスと予約は別商品」という認識を正式廃止' },
      { phase: '準備', title: 'トークスクリプト改訂',       body: 'プラチナPLUSを最初から一体型商品として提案する順序に変更（コンパス→予約追加から切り替え）' },
      { phase: '準備', title: '反論対応集の作成',           body: '「高い」「今は要らない」への回答集。19,800円 vs 20,000円超の価値で統一訴求' },
      { phase: '準備', title: '既存資料の文言統一',         body: 'LP・提案書・メールテンプレートの商品説明を決定定義に統一' },
      { phase: '実践', title: 'プラチナPLUSファースト提案',  body: '無料体験開始時点から推奨プランとして提示。単体プランはダウングレード選択肢と位置づける' },
      { phase: '実践', title: '年間払い誘導の標準化',       body: '自動課金回避＋コスト感軽減として月払いより先に年間払いを提示するフローへ変更' },
      { phase: '実践', title: 'フォロー導線の統合',         body: 'KPIツール＋自動アドバイス＋代行設置フォームを「プラチナPLUS有料化導線」として一本化' },
    ];

    const colW = 334, rowH = 46, startY = 66;
    measures.forEach((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 20 + col * 350;
      const y = startY + row * (rowH + 4);
      const phaseColor = m.phase === '準備' ? '#3d5a99' : COLOR.gold;
      addRect(s, x, y, colW, rowH, COLOR.white, COLOR.border);
      addRect(s, x, y, 4, rowH, phaseColor, null);
      // フェーズタグ
      addRect(s, x + 8, y + 6, 36, 16, phaseColor, null);
      addText(s, m.phase, x + 8, y + 7, 36, 14, { size: 7, bold: true, color: COLOR.white, align: 'center' });
      // タイトル
      addText(s, m.title, x + 50, y + 4, colW - 56, 18, { size: 10, bold: true, color: COLOR.navy });
      // 本文
      addText(s, m.body, x + 50, y + 22, colW - 56, 22, { size: 8, color: COLOR.gray });
    });

    // 測定ポイント
    addRect(s, 20, 270, 680, 118, '#e8f0fe', '#3d5a99');
    addRect(s, 20, 270, 680, 22, '#3d5a99', null);
    addText(s, '測定ポイント', 28, 273, 300, 18, { size: 10, bold: true, color: COLOR.white });

    const metrics = [
      ['週次モニタリング', 'プラチナPLUS有料化率を毎週計測（目標：8.04% → 40%）'],
      ['成功事例の即時横展開', '有料化できた院のトーク事例を週次でCS全体に共有'],
      ['離脱ポイントの特定', 'どのフェーズで単体プランに落ちているかを記録し、スクリプトに反映'],
    ];
    metrics.forEach(([title, body], i) => {
      const y = 296 + i * 30;
      addRect(s, 28, y + 2, 8, 8, '#3d5a99', null);
      addText(s, title, 44, y, 160, 22, { size: 10, bold: true, color: COLOR.navy });
      addText(s, body, 210, y, 480, 22, { size: 9, color: COLOR.gray });
    });
  }

  // ===== 完了ログ =====
  const url = presentation.getUrl();
  Logger.log('プレゼンテーションを更新しました: ' + url);
  return url;
}
