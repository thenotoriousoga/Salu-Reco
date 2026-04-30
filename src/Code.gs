// ===================================
// フットサル試合管理システム - メインスクリプト
// ===================================

// --- 定数 ---
const SPREADSHEET_ID = ''; // デプロイ後にスプレッドシートIDを設定（空の場合は自動作成）

// --- スプレッドシート取得 ---
function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
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

  // メンバーシート
  let membersSheet = ss.getSheetByName('メンバー');
  if (!membersSheet) {
    membersSheet = ss.insertSheet('メンバー');
    membersSheet.appendRow(['ID', '名前', '年次', 'サッカー経験', '幹事', '登録日']);
  }

  // イベントシート
  let eventsSheet = ss.getSheetByName('イベント');
  if (!eventsSheet) {
    eventsSheet = ss.insertSheet('イベント');
    eventsSheet.appendRow(['イベントID', '日付', '名称', 'ステータス', 'MVP人数', '準MVP人数', 'フォームURL', 'フォームID']);
  }

  // ラウンドシート（複数回のチーム分け・試合）
  let roundsSheet = ss.getSheetByName('ラウンド');
  if (!roundsSheet) {
    roundsSheet = ss.insertSheet('ラウンド');
    roundsSheet.appendRow(['ラウンドID', 'イベントID', 'ラウンド番号', 'チームA名', 'チームB名', 'スコアA', 'スコアB', 'ステータス']);
  }

  // ラウンドメンバーシート
  let roundMembersSheet = ss.getSheetByName('ラウンドメンバー');
  if (!roundMembersSheet) {
    roundMembersSheet = ss.insertSheet('ラウンドメンバー');
    roundMembersSheet.appendRow(['ラウンドID', 'メンバーID', 'チーム']);
  }

  // 得点シート
  let goalsSheet = ss.getSheetByName('得点');
  if (!goalsSheet) {
    goalsSheet = ss.insertSheet('得点');
    goalsSheet.appendRow(['ラウンドID', 'メンバーID', '得点数']);
  }

  // アンケート回答シート
  let surveySheet = ss.getSheetByName('アンケート回答');
  if (!surveySheet) {
    surveySheet = ss.insertSheet('アンケート回答');
    surveySheet.appendRow(['イベントID', '回答者名', '対象メンバーID', '対象メンバー名', 'コメント']);
  }

  // MVP結果シート
  let mvpSheet = ss.getSheetByName('MVP結果');
  if (!mvpSheet) {
    mvpSheet = ss.insertSheet('MVP結果');
    mvpSheet.appendRow(['イベントID', 'メンバーID', '名前', '順位', '理由', '定量スコア', '定性スコア', '総合スコア']);
  }

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

function getSheetData_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}
