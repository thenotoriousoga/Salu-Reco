// ===================================
// イベント管理
// イベントCRUD（作成・取得・更新・ステータス遷移）
// ===================================

// ===================================
// イベント取得
// ===================================

/**
 * 全イベントを取得する（新しい順）
 * @return {Object[]} イベント配列
 */
function getEvents() {
  return getSheetData_('イベント').reverse();
}

/**
 * イベントIDでイベントデータを検索する
 * @param {string} eventId - イベントID
 * @return {Object|null} イベントオブジェクト、見つからない場合はnull
 */
function findEvent_(eventId) {
  var events = getSheetData_('イベント');
  return events.find(function(e) { return e['イベントID'] === eventId; }) || null;
}

/**
 * イベント詳細を取得する（メンバー・ラウンド・MVP結果含む）
 * @param {string} eventId - イベントID
 * @return {Object|null} イベント詳細データ
 */
function getEventDetail(eventId) {
  var data = getMultipleSheetData_(['イベント', 'メンバー', 'ラウンド', 'マッチ', 'マッチメンバー', '得点', 'MVP結果']);

  var event = data['イベント'].find(function(e) { return e['イベントID'] === eventId; });
  if (!event) return null;

  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = buildRoundsData_(
    data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; }),
    data['マッチ'], data['マッチメンバー'], data['得点'], memberMap
  );

  var mvpResults = data['MVP結果'].filter(function(r) { return r['イベントID'] === eventId; });

  var surveyVoters = [];
  if (event['フォームID']) {
    surveyVoters = getSurveyVoters(eventId);
  }

  return {
    event: event,
    members: members,
    rounds: rounds,
    mvpResults: mvpResults,
    surveyVoters: surveyVoters
  };
}

// ===================================
// イベント作成
// ===================================

/**
 * 新規イベントを作成する
 * @param {string} date - 日付
 * @param {string} name - イベント名
 * @param {string} code - 参加コード
 * @return {Object} 結果オブジェクト { success, eventId, code, message }
 */
function createNewEvent(date, name, code) {
  if (!code || !code.trim()) {
    return { success: false, message: '参加コードを入力してください' };
  }
  code = code.trim().toUpperCase();

  var existing = getSheetData_('イベント');
  var dup = existing.find(function(e) { return String(e['コード']).toUpperCase() === code; });
  if (dup) {
    return { success: false, message: 'このコードは既に使われています' };
  }

  var ss = getSpreadsheet_();
  var sheet = ensureSheet_(ss, 'イベント');
  var eventId = generateId_();
  sheet.appendRow([eventId, date, name || 'フットサル', '準備中', '', '', code]);

  return { success: true, eventId: eventId, code: code, message: 'イベントを作成しました' };
}

// ===================================
// イベント更新
// ===================================

/**
 * イベントの特定フィールドを更新する
 * @param {string} eventId - イベントID
 * @param {number} colIndex - 列インデックス（1始まり）
 * @param {*} value - 設定する値
 * @return {boolean} 成功したかどうか
 */
function updateEventField_(eventId, colIndex, value) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex === -1) return false;
  sheet.getRange(rowIndex, colIndex).setValue(value);
  return true;
}

/**
 * イベントのステータスを更新する
 * @param {string} eventId - イベントID
 * @param {string} status - ステータス（準備中/進行中/試合終了/完了）
 * @return {Object} 結果オブジェクト { success }
 */
function updateEventStatus(eventId, status) {
  updateEventField_(eventId, 4, status);
  return { success: true };
}

// ===================================
// ステータス遷移
// ===================================

/**
 * イベントを「試合終了」状態にする
 * 全ラウンド・全マッチが終了している必要がある
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function endEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== '進行中') {
    return { success: false, message: '進行中のイベントのみ終了できます' };
  }

  // 全ラウンド・全マッチの終了チェック
  var data = getMultipleSheetData_(['ラウンド', 'マッチ']);
  var rounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });

  if (rounds.length === 0) {
    return { success: false, message: 'ラウンドがありません' };
  }
  if (rounds.some(function(r) { return r['ステータス'] !== '終了'; })) {
    return { success: false, message: '進行中のラウンドがあります。先にラウンドを終了してください' };
  }

  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });
  var matches = data['マッチ'].filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0; });
  if (matches.some(function(m) { return m['ステータス'] !== '終了'; })) {
    return { success: false, message: '進行中の試合があります。先に試合を終了してください' };
  }

  updateEventStatus(eventId, '試合終了');
  return { success: true, message: 'イベントを終了しました。MVP選出が可能です' };
}

/**
 * イベントを「進行中」状態に戻す
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function reopenEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== '試合終了') {
    return { success: false, message: '試合終了状態のイベントのみ再開できます' };
  }

  updateEventStatus(eventId, '進行中');
  return { success: true, message: 'イベントを進行中に戻しました' };
}

/**
 * イベントを「完了」状態にする
 * Googleフォームの回答受付も停止する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function completeEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== '試合終了') {
    return { success: false, message: '試合終了状態のイベントのみ完了にできます' };
  }

  setFormAccepting_(event['フォームID'], false);
  updateEventStatus(eventId, '完了');
  return { success: true, message: 'イベントを完了しました' };
}

/**
 * イベントを「試合終了」状態に戻す（完了から差し戻し）
 * Googleフォームの回答受付を再開する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function uncompleteEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== '完了') {
    return { success: false, message: '完了状態のイベントのみ差し戻しできます' };
  }

  setFormAccepting_(event['フォームID'], true);
  updateEventStatus(eventId, '試合終了');
  return { success: true, message: 'イベントを試合終了に戻しました' };
}

/**
 * Googleフォームの回答受付状態を変更する
 * @param {string} formId - フォームID
 * @param {boolean} accepting - 受付するかどうか
 */
function setFormAccepting_(formId, accepting) {
  if (!formId) return;
  try {
    FormApp.openById(formId).setAcceptingResponses(accepting);
  } catch (e) {
    // フォームが見つからない場合は無視
  }
}
