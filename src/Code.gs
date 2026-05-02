// ===================================
// フットサル試合管理システム - メインスクリプト
// ===================================

/**
 * 各シートのヘッダー定義
 * シート初期化やデータ取得時に参照する
 */
var SHEET_HEADERS_ = {
  'イベント': ['イベントID', '日付', '名称', 'ステータス', 'MVP人数', '準MVP人数', 'フォームURL', 'フォームID', 'コード'],
  'メンバー': ['メンバーID', 'イベントID', '名前', '年次', 'サッカー経験', '幹事', '備考'],
  'ラウンド': ['ラウンドID', 'イベントID', 'ラウンド番号', 'チーム分けJSON', 'ステータス'],
  'マッチ': ['マッチID', 'ラウンドID', 'マッチ番号', 'チームA名', 'チームB名', 'スコアA', 'スコアB', 'ステータス'],
  'マッチメンバー': ['マッチID', 'メンバーID', 'チーム'],
  '得点': ['マッチID', 'メンバーID', '得点数'],
  'アンケート回答': ['イベントID', '回答者名', '対象メンバーID', '対象メンバー名', 'コメント'],
  'MVP結果': ['イベントID', 'メンバーID', '名前', '順位', '理由', '総合スコア']
};

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

/**
 * シートが存在しなければ作成してヘッダーを設定する
 * @param {Spreadsheet} ss - スプレッドシート
 * @param {string} sheetName - シート名
 * @return {Sheet} 作成済みまたは既存のシート
 */
function ensureSheet_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = SHEET_HEADERS_[sheetName];
    if (headers) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

// --- シート初期化 ---
function initializeSheets() {
  var ss = getSpreadsheet_();

  // 全シートを作成
  var sheetNames = Object.keys(SHEET_HEADERS_);
  sheetNames.forEach(function(name) {
    ensureSheet_(ss, name);
  });

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
    headers.forEach(function(h, i) {
      var val = row[i];
      // Dateオブジェクトはクライアントにシリアライズできないため文字列に変換
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy/MM/dd');
      }
      obj[h] = val;
    });
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

/**
 * 指定シートで特定列の値が一致する行を検索し、行インデックス（1始まり）を返す
 * 見つからない場合は -1 を返す
 * @param {Sheet} sheet - 対象シート
 * @param {number} colIndex - 検索対象の列インデックス（0始まり）
 * @param {string} value - 検索値
 * @return {number} 行インデックス（1始まり）、見つからない場合は -1
 */
function findRowIndex_(sheet, colIndex, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][colIndex] === value) {
      return i + 1;
    }
  }
  return -1;
}

/**
 * 配列からIDをキーにしたマップを作成する
 * @param {Object[]} items - オブジェクトの配列
 * @param {string} idKey - キーとして使うプロパティ名
 * @return {Object} IDをキーにしたマップ
 */
function buildMap_(items, idKey) {
  var map = {};
  items.forEach(function(item) {
    map[item[idKey]] = item;
  });
  return map;
}
