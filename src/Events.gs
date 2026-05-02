// ===================================
// イベント管理
// ===================================

function getEvents() {
  return getSheetData_('イベント').reverse();
}

function createNewEvent(date, name, code) {
  if (!code || !code.trim()) {
    return { success: false, message: '参加コードを入力してください' };
  }
  code = code.trim().toUpperCase();
  // コード重複チェック
  var existing = getSheetData_('イベント');
  var dup = existing.find(function(e) { return String(e['コード']).toUpperCase() === code; });
  if (dup) {
    return { success: false, message: 'このコードは既に使われています' };
  }
  var ss = getSpreadsheet_();
  var sheet = ensureSheet_(ss, 'イベント');
  var eventId = generateId_();
  sheet.appendRow([eventId, date, name || 'フットサル', '準備中', 1, 1, '', '', code]);
  return { success: true, eventId: eventId, code: code, message: 'イベントを作成しました' };
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

function getEventDetail(eventId) {
  var event = findEvent_(eventId);
  if (!event) return null;

  var members = getEventMembers(eventId);
  var rounds = getRounds(eventId);
  var mvpResults = getMvpResults(eventId);

  return {
    event: event,
    members: members,
    rounds: rounds,
    mvpResults: mvpResults
  };
}

function updateEventField_(eventId, colIndex, value) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex === -1) return false;
  sheet.getRange(rowIndex, colIndex).setValue(value);
  return true;
}

function updateEventStatus(eventId, status) {
  updateEventField_(eventId, 4, status);
  return { success: true };
}

function updateMvpSettings(eventId, mvpCount, subMvpCount) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex === -1) {
    return { success: false, message: 'イベントが見つかりません' };
  }
  sheet.getRange(rowIndex, 5).setValue(Number(mvpCount) || 1);
  sheet.getRange(rowIndex, 6).setValue(Number(subMvpCount) || 1);
  return { success: true, message: 'MVP設定を更新しました' };
}

function deleteEvent(eventId) {
  // 関連ラウンド・マッチを削除
  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  rounds.forEach(function(round) {
    var matches = getSheetData_('マッチ').filter(function(m) { return m['ラウンドID'] === round['ラウンドID']; });
    matches.forEach(function(m) {
      deleteRowsByMatch_('マッチメンバー', 0, m['マッチID']);
      deleteRowsByMatch_('得点', 0, m['マッチID']);
    });
    deleteRowsByMatch_('マッチ', 1, round['ラウンドID']);
  });
  deleteRowsByMatch_('ラウンド', 1, eventId);
  deleteRowsByMatch_('メンバー', 1, eventId);
  deleteRowsByMatch_('アンケート回答', 0, eventId);
  deleteRowsByMatch_('MVP結果', 0, eventId);
  deleteRowsByMatch_('イベント', 0, eventId);

  return { success: true, message: 'イベントを削除しました' };
}

// ===================================
// 認証・ロール管理
// ===================================

/**
 * 管理者パスワードで認証する
 * @param {string} password - 入力されたパスワード
 * @return {Object} { success: boolean, role: string, message: string }
 */
function loginAdmin(password) {
  var props = PropertiesService.getScriptProperties();
  var adminPassword = props.getProperty('ADMIN_PASSWORD');
  if (!adminPassword) {
    return { success: false, message: '管理者パスワードが設定されていません。initializeSheets を実行してください。' };
  }
  if (password === adminPassword) {
    return { success: true, role: 'admin' };
  }
  return { success: false, message: 'パスワードが正しくありません' };
}

/**
 * イベントコードでイベントを検索する
 * @param {string} code - イベントコード（4桁英数字）
 * @return {Object} { success: boolean, role: string, eventId: string, message: string }
 */
function loginWithCode(code) {
  if (!code || !code.trim()) {
    return { success: false, message: 'コードを入力してください' };
  }
  var events = getSheetData_('イベント');
  var found = events.find(function(e) {
    return String(e['コード']).toUpperCase() === String(code).trim().toUpperCase();
  });
  if (!found) {
    return { success: false, message: 'イベントが見つかりません。コードを確認してください。' };
  }
  return { success: true, role: 'user', eventId: found['イベントID'] };
}

/**
 * 管理者パスワードを取得する（管理者向け確認用）
 * @return {Object} { success: boolean, password: string }
 */
function getAdminPassword() {
  var props = PropertiesService.getScriptProperties();
  var password = props.getProperty('ADMIN_PASSWORD');
  if (!password) {
    return { success: false, message: '管理者パスワードが設定されていません' };
  }
  return { success: true, password: password };
}
