// ===================================
// フットサル試合管理システム - メインスクリプト
// ===================================

// --- 定数 ---
// スプレッドシートIDはスクリプトプロパティ「SPREADSHEET_ID」から取得
// GASエディタ →「プロジェクトの設定」→「スクリプトプロパティ」で設定

// --- スプレッドシート取得 ---
function getSpreadsheet_() {
  const scriptProps = PropertiesService.getScriptProperties();
  const ssId = scriptProps.getProperty('SPREADSHEET_ID');
  if (ssId) {
    return SpreadsheetApp.openById(ssId);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  const newSs = SpreadsheetApp.create('フットサル管理システム');
  Logger.log('新しいスプレッドシートを作成しました: ' + newSs.getUrl());
  return newSs;
}

// --- シート初期化 ---
function initializeSheets() {
  const ss = getSpreadsheet_();
  Object.keys(SHEET_DEFINITIONS_).forEach(name => getSheet_(name, ss));

  // デフォルトシート削除
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  return 'シートの初期化が完了しました';
}

// --- Webアプリのエントリーポイント ---
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
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

// シート定義（シート名 → ヘッダー行）
const SHEET_DEFINITIONS_ = {
  'メンバー': ['ID', '名前', '年次', 'サッカー経験', '幹事', '登録日'],
  'イベント': ['イベントID', '日付', '名称', 'ステータス', 'MVP人数', '準MVP人数', 'フォームURL', 'フォームID'],
  'ラウンド': ['ラウンドID', 'イベントID', 'ラウンド番号', 'チームA名', 'チームB名', 'スコアA', 'スコアB', 'ステータス'],
  'ラウンドメンバー': ['ラウンドID', 'メンバーID', 'チーム'],
  '得点': ['ラウンドID', 'メンバーID', '得点数'],
  'アンケート回答': ['イベントID', '回答者名', '対象メンバーID', '対象メンバー名', 'コメント'],
  'MVP結果': ['イベントID', 'メンバーID', '名前', '順位', '理由', '定量スコア', '定性スコア', '総合スコア']
};

// シート取得（存在しなければヘッダー付きで自動作成）
function getSheet_(sheetName, ss) {
  ss = ss || getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);
  const headers = SHEET_DEFINITIONS_[sheetName];

  if (!sheet) {
    // シートが存在しない → 作成してヘッダーを追加
    sheet = ss.insertSheet(sheetName);
    if (headers) {
      sheet.appendRow(headers);
    }
    // デフォルトシート（Sheet1/シート1）を削除
    const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } else if (headers && sheet.getLastRow() === 0) {
    // シートは存在するがヘッダーがない → ヘッダーを追加
    sheet.appendRow(headers);
  }

  return sheet;
}

function getSheetData_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = getSheet_(sheetName, ss);
  if (sheet.getLastRow() < 2) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}
