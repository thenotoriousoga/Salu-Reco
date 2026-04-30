// ===================================
// イベント管理
// ===================================

function getEvents() {
  return getSheetData_('イベント').reverse();
}

function createNewEvent(date, name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var eventId = generateId_();
  sheet.appendRow([eventId, date, name || 'フットサル', '準備中', 1, 1, '', '']);
  return { success: true, eventId: eventId, message: 'イベントを作成しました' };
}

function getEventDetail(eventId) {
  var events = getSheetData_('イベント');
  var event = events.find(function(e) { return e['イベントID'] === eventId; });
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
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.getRange(i + 1, colIndex).setValue(value);
      return true;
    }
  }
  return false;
}

function updateEventStatus(eventId, status) {
  updateEventField_(eventId, 4, status);
  return { success: true };
}

function updateMvpSettings(eventId, mvpCount, subMvpCount) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.getRange(i + 1, 5).setValue(Number(mvpCount) || 1);
      sheet.getRange(i + 1, 6).setValue(Number(subMvpCount) || 1);
      return { success: true, message: 'MVP設定を更新しました' };
    }
  }
  return { success: false, message: 'イベントが見つかりません' };
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
