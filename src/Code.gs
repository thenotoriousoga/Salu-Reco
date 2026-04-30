// ===================================
// フットサル試合管理システム - メインスクリプト
// ===================================

function getSpreadsheet_() {
  // 1. スクリプトプロパティから取得
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) {
    return SpreadsheetApp.openById(ssId);
  }

  // 2. コンテナバインドスクリプトの場合
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;

  // 3. どちらもない場合はエラー
  throw new Error(
    'スプレッドシートが見つかりません。スクリプトプロパティに SPREADSHEET_ID を設定してください。' +
    '（Apps Script エディタ → プロジェクトの設定 → スクリプトプロパティ）'
  );
}

// --- シート初期化 ---
function initializeSheets() {
  var ss = getSpreadsheet_();

  // イベント
  if (!ss.getSheetByName('イベント')) {
    ss.insertSheet('イベント').appendRow([
      'イベントID', '日付', '名称', 'ステータス', 'MVP人数', '準MVP人数', 'フォームURL', 'フォームID'
    ]);
  }

  // メンバー（イベントに紐づく）
  if (!ss.getSheetByName('メンバー')) {
    ss.insertSheet('メンバー').appendRow([
      'メンバーID', 'イベントID', '名前', '年次', 'サッカー経験', '幹事'
    ]);
  }

  // ラウンド
  if (!ss.getSheetByName('ラウンド')) {
    ss.insertSheet('ラウンド').appendRow([
      'ラウンドID', 'イベントID', 'ラウンド番号', 'チームA名', 'チームB名', 'スコアA', 'スコアB', 'ステータス'
    ]);
  }

  // ラウンドメンバー
  if (!ss.getSheetByName('ラウンドメンバー')) {
    ss.insertSheet('ラウンドメンバー').appendRow([
      'ラウンドID', 'メンバーID', 'チーム'
    ]);
  }

  // 得点
  if (!ss.getSheetByName('得点')) {
    ss.insertSheet('得点').appendRow([
      'ラウンドID', 'メンバーID', '得点数'
    ]);
  }

  // アンケート回答
  if (!ss.getSheetByName('アンケート回答')) {
    ss.insertSheet('アンケート回答').appendRow([
      'イベントID', '回答者名', '対象メンバーID', '対象メンバー名', 'コメント'
    ]);
  }

  // MVP結果
  if (!ss.getSheetByName('MVP結果')) {
    ss.insertSheet('MVP結果').appendRow([
      'イベントID', 'メンバーID', '名前', '順位', '理由', '定量スコア', '定性スコア', '総合スコア'
    ]);
  }

  // デフォルトシート削除
  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  return 'シートの初期化が完了しました';
}

// --- Webアプリのエントリーポイント ---
function doGet() {
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('フットサル管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// --- ユーティリティ ---
function generateId_() {
  return Utilities.getUuid().substring(0, 8);
}

function getSheetData_(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function deleteRowsByMatch_(sheetName, colIndex, value) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return;
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex]) === String(value)) {
      sheet.deleteRow(i + 1);
    }
  }
}
