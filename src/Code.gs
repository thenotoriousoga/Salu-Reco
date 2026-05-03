// ===================================
// Salu-Rec - メインスクリプト
// 共通処理（スプレッドシート取得、シート初期化、ユーティリティ関数）
// ===================================

// ===================================
// 定数
// ===================================

/**
 * 各シートのヘッダー定義
 * シート初期化やデータ取得時に参照する
 */
var SHEET_HEADERS_ = {
  'イベント': ['イベントID', '日付', '名称', 'ステータス', 'フォームURL', 'フォームID', 'コード'],
  'メンバー': ['メンバーID', 'イベントID', '名前', '年次', 'サッカー経験', '幹事', '備考'],
  'ラウンド': ['ラウンドID', 'イベントID', 'ラウンド番号', 'チーム分けJSON', 'ステータス'],
  'マッチ': ['マッチID', 'ラウンドID', 'マッチ番号', 'チームA名', 'チームB名', 'ステータス'],
  'マッチメンバー': ['マッチID', 'メンバーID', 'チーム'],
  '得点': ['得点ID', 'マッチID', 'チーム', 'メンバーID', '種別'],
  'アンケート回答': ['イベントID', '回答者名', '対象メンバーID', '対象メンバー名', 'コメント'],
  'MVP結果': ['イベントID', 'メンバーID', '名前', '順位', '称号', '理由', '総合スコア', 'レーティング', '評価コメント']
};

// ===================================
// スプレッドシート取得（キャッシュ付き）
// ===================================

/** @type {Spreadsheet|null} 同一実行コンテキスト内で再利用するキャッシュ */
var ssCache_ = null;

/**
 * スプレッドシートを取得する（キャッシュ付き）
 * スクリプトプロパティ SPREADSHEET_ID から取得する
 * @return {Spreadsheet} スプレッドシート
 * @throws {Error} SPREADSHEET_ID が未設定の場合
 */
function getSpreadsheet_() {
  if (ssCache_) return ssCache_;

  var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!ssId) {
    throw new Error(
      'スプレッドシートが見つかりません。スクリプトプロパティに SPREADSHEET_ID を設定してください。' +
      '（Apps Script エディタ → プロジェクトの設定 → スクリプトプロパティ）'
    );
  }

  ssCache_ = SpreadsheetApp.openById(ssId);
  return ssCache_;
}

// ===================================
// シート操作
// ===================================

/**
 * シートが存在しなければ作成してヘッダーを設定する
 * 既存シートのヘッダーには触れない
 * @param {Spreadsheet} ss - スプレッドシート
 * @param {string} sheetName - シート名
 * @return {Sheet} 作成済みまたは既存のシート
 */
function ensureSheet_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = SHEET_HEADERS_[sheetName];
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}

/**
 * 全シートを初期化する（手動実行用）
 * シートが存在しなければ作成し、ヘッダー行を上書きする
 * @return {string} 完了メッセージ
 */
function initializeSheets() {
  var ss = getSpreadsheet_();
  Object.keys(SHEET_HEADERS_).forEach(function(name) {
    var sheet = ensureSheet_(ss, name);
    var headers = SHEET_HEADERS_[name];
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });

  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  return 'シートの初期化が完了しました';
}

// ===================================
// Webアプリのエントリーポイント
// ===================================

/**
 * GETリクエストを処理する（Webアプリのエントリーポイント）
 * @return {HtmlOutput} HTMLページ
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('SALU-REC')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * HTMLファイルをインクルードする
 * @param {string} filename - ファイル名
 * @return {string} HTMLコンテンツ
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===================================
// ユーティリティ関数
// ===================================

/**
 * 8文字のUUIDを生成する
 * @return {string} UUID先頭8文字
 */
function generateId_() {
  return Utilities.getUuid().substring(0, 8);
}

/** @type {string|null} タイムゾーンキャッシュ */
var tzCache_ = null;

/**
 * スクリプトのタイムゾーンを取得する（キャッシュ付き）
 * @return {string} タイムゾーン文字列
 */
function getTimeZone_() {
  if (!tzCache_) tzCache_ = Session.getScriptTimeZone();
  return tzCache_;
}

/**
 * シートデータをオブジェクト配列として取得する
 * @param {string} sheetName - シート名
 * @return {Object[]} データ配列
 */
function getSheetData_(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  return sheetToObjects_(sheet);
}

/**
 * シートオブジェクトからデータをオブジェクト配列に変換する
 * @param {Sheet} sheet - シートオブジェクト
 * @return {Object[]} データ配列
 */
function sheetToObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var tz = getTimeZone_();
  var result = [];

  for (var i = 1; i < allData.length; i++) {
    var row = allData[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      // Dateオブジェクトはクライアントにシリアライズできないため文字列に変換
      if (val instanceof Date) {
        val = Utilities.formatDate(val, tz, 'yyyy/MM/dd');
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

/**
 * 複数シートのデータを一括取得する
 * 個別にgetSheetData_を呼ぶより高速（スプレッドシート取得が1回で済む）
 * @param {string[]} sheetNames - 取得するシート名の配列
 * @return {Object} シート名をキーにしたデータオブジェクト
 */
function getMultipleSheetData_(sheetNames) {
  var ss = getSpreadsheet_();
  var result = {};
  sheetNames.forEach(function(name) {
    result[name] = sheetToObjects_(ss.getSheetByName(name));
  });
  return result;
}

/**
 * 指定列の値が一致する行を削除する（バッチ処理版）
 * 削除対象以外の行を残して一括書き換えすることで高速化
 * @param {string} sheetName - シート名
 * @param {number} colIndex - 列インデックス（0始まり）
 * @param {string} value - 検索値
 */
function deleteRowsByMatch_(sheetName, colIndex, value) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colCount = headers.length;
  var strValue = String(value);

  var remaining = [headers];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) !== strValue) {
      remaining.push(data[i]);
    }
  }

  if (remaining.length === data.length) return;

  sheet.clearContents();
  if (remaining.length > 0) {
    sheet.getRange(1, 1, remaining.length, colCount).setValues(remaining);
  }
}

/**
 * 指定シートで特定列の値が一致する行を検索し、行インデックス（1始まり）を返す
 * @param {Sheet} sheet - 対象シート
 * @param {number} colIndex - 検索対象の列インデックス（0始まり）
 * @param {string} value - 検索値
 * @return {number} 行インデックス（1始まり）、見つからない場合は -1
 */
function findRowIndex_(sheet, colIndex, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][colIndex] === value) return i + 1;
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

/**
 * シートの末尾に複数行を一括追加する
 * @param {Sheet} sheet - 対象シート
 * @param {Array[]} rows - 追加する行データの配列
 */
function appendRows_(sheet, rows) {
  if (!rows || rows.length === 0) return;
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
}
