// ===================================
// イベント管理
// ===================================

function createEvent(date, name) {
  const ss = getSpreadsheet_();
  const sheet = getSheet_('イベント', ss);
  const eventId = generateId_();
  sheet.appendRow([eventId, date, name || 'フットサル', '準備中', 1, 1, '', '']);
  return { success: true, eventId: eventId, message: 'イベントを作成しました' };
}

function getEvents() {
  const events = getSheetData_('イベント');
  return events.reverse();
}

function getEventDetail(eventId) {
  const events = getSheetData_('イベント');
  const event = events.find(e => e['イベントID'] === eventId);
  if (!event) return null;

  const rounds = getRounds(eventId);
  const members = getMembers();

  return {
    event: event,
    rounds: rounds,
    members: members
  };
}

function updateEventStatus(eventId, status) {
  const ss = getSpreadsheet_();
  const sheet = getSheet_('イベント', ss);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.getRange(i + 1, 4).setValue(status);
      return { success: true };
    }
  }
  return { success: false, message: 'イベントが見つかりません' };
}

function updateMvpSettings(eventId, mvpCount, subMvpCount) {
  const ss = getSpreadsheet_();
  const sheet = getSheet_('イベント', ss);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.getRange(i + 1, 5).setValue(Number(mvpCount) || 1);
      sheet.getRange(i + 1, 6).setValue(Number(subMvpCount) || 1);
      return { success: true, message: 'MVP設定を更新しました' };
    }
  }
  return { success: false, message: 'イベントが見つかりません' };
}

function deleteEvent(eventId) {
  const ss = getSpreadsheet_();

  // イベント削除
  const eventSheet = getSheet_('イベント', ss);
  const eventData = eventSheet.getDataRange().getValues();
  for (let i = eventData.length - 1; i >= 1; i--) {
    if (eventData[i][0] === eventId) {
      eventSheet.deleteRow(i + 1);
      break;
    }
  }

  // 関連ラウンド取得
  const roundIds = getSheetData_('ラウンド')
    .filter(r => r['イベントID'] === eventId)
    .map(r => r['ラウンドID']);

  // ラウンド削除
  deleteRowsByColumn_(ss, 'ラウンド', 1, eventId);

  // ラウンドメンバー・得点削除
  roundIds.forEach(rId => {
    deleteRowsByColumn_(ss, 'ラウンドメンバー', 0, rId);
    deleteRowsByColumn_(ss, '得点', 0, rId);
  });

  // アンケート・MVP結果削除
  deleteRowsByColumn_(ss, 'アンケート回答', 0, eventId);
  deleteRowsByColumn_(ss, 'MVP結果', 0, eventId);

  return { success: true, message: 'イベントを削除しました' };
}

function deleteRowsByColumn_(ss, sheetName, colIndex, value) {
  const sheet = getSheet_(sheetName, ss);
  if (sheet.getLastRow() < 2) return;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][colIndex] === value) {
      sheet.deleteRow(i + 1);
    }
  }
}
