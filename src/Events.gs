// ===================================
// イベント管理
// ===================================

function getEvents() {
  return getSheetData_('イベント').reverse();
}

function createNewEvent(date, name) {
  var ss = getSpreadsheet_();
  var sheet = ensureSheet_(ss, 'イベント');
  var eventId = generateId_();
  sheet.appendRow([eventId, date, name || 'フットサル', '準備中', 1, 1, '', '', '']);
  return { success: true, eventId: eventId, message: 'イベントを作成しました' };
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

  // チーム分け結果を復元
  var savedSplit = null;
  if (event['チーム分けJSON']) {
    try { savedSplit = JSON.parse(event['チーム分けJSON']); } catch (e) { savedSplit = null; }
  }

  return {
    event: event,
    members: members,
    rounds: rounds,
    mvpResults: mvpResults,
    savedSplit: savedSplit
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
  // 関連ラウンドID取得
  var roundIds = getSheetData_('ラウンド')
    .filter(function(r) { return r['イベントID'] === eventId; })
    .map(function(r) { return r['ラウンドID']; });

  // 関連データ削除
  roundIds.forEach(function(rId) {
    deleteRowsByMatch_('ラウンドメンバー', 0, rId);
    deleteRowsByMatch_('得点', 0, rId);
  });
  deleteRowsByMatch_('ラウンド', 1, eventId);
  deleteRowsByMatch_('メンバー', 1, eventId);
  deleteRowsByMatch_('アンケート回答', 0, eventId);
  deleteRowsByMatch_('MVP結果', 0, eventId);
  deleteRowsByMatch_('イベント', 0, eventId);

  return { success: true, message: 'イベントを削除しました' };
}

/**
 * チーム分け結果をイベントに保存する
 * @param {string} eventId - イベントID
 * @param {string[]} teamNames - チーム名の配列
 * @param {string[][]} teams - チームごとのメンバーID配列の配列
 * @return {Object} 結果オブジェクト
 */
function saveTeamSplit(eventId, teamNames, teams) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  // 既存シートに「チーム分けJSON」カラムがない場合はヘッダーを追加
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('チーム分けJSON') === -1) {
    var nextCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, nextCol).setValue('チーム分けJSON');
  }
  // カラム位置を再取得
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = headers.indexOf('チーム分けJSON') + 1;

  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex === -1) return { success: false, message: 'イベントが見つかりません' };

  var data = JSON.stringify({ names: teamNames, teams: teams });
  sheet.getRange(rowIndex, colIndex).setValue(data);
  return { success: true };
}

/**
 * チーム分け結果をクリアする
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト
 */
function clearTeamSplit(eventId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIdx = headers.indexOf('チーム分けJSON');
  if (colIdx === -1) return { success: true };
  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex === -1) return { success: true };
  sheet.getRange(rowIndex, colIdx + 1).setValue('');
  return { success: true };
}
