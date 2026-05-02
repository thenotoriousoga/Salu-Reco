// ===================================
// イベント管理
// イベントCRUD（作成・取得・更新・削除）
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

// ===================================
// イベント更新
// ===================================

/**
 * イベントの特定フィールドを更新する（内部用）
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
 * @param {string} status - ステータス（準備中/進行中/完了）
 * @return {Object} 結果オブジェクト { success }
 */
function updateEventStatus(eventId, status) {
  updateEventField_(eventId, 4, status);
  return { success: true };
}

/**
 * MVP設定を更新する
 * @param {string} eventId - イベントID
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {Object} 結果オブジェクト { success, message }
 */
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

// ===================================
// イベント削除
// ===================================

/**
 * イベントを削除する（関連データも全て削除）
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
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

  // 関連データを削除
  deleteRowsByMatch_('ラウンド', 1, eventId);
  deleteRowsByMatch_('メンバー', 1, eventId);
  deleteRowsByMatch_('アンケート回答', 0, eventId);
  deleteRowsByMatch_('MVP結果', 0, eventId);
  deleteRowsByMatch_('イベント', 0, eventId);

  return { success: true, message: 'イベントを削除しました' };
}
