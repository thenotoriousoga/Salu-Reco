// ===================================
// メンバー管理（イベントに紐づく）
// ===================================

function getEventMembers(eventId) {
  return getSheetData_('メンバー').filter(function(m) {
    return m['イベントID'] === eventId;
  });
}

function addEventMember(eventId, name, years, experience, isOrganizer) {
  if (!name || !name.trim()) return { success: false, message: '名前を入力してください' };
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('メンバー');
  var id = generateId_();
  sheet.appendRow([
    id,
    eventId,
    name.trim(),
    Number(years) || 1,
    experience ? 'あり' : 'なし',
    isOrganizer ? 'はい' : 'いいえ'
  ]);
  return { success: true, message: name.trim() + ' を登録しました', id: id };
}

function updateEventMember(memberId, name, years, experience, isOrganizer) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('メンバー');
  var rowIndex = findRowIndex_(sheet, 0, memberId);
  if (rowIndex === -1) {
    return { success: false, message: 'メンバーが見つかりません' };
  }
  sheet.getRange(rowIndex, 3).setValue(name.trim());
  sheet.getRange(rowIndex, 4).setValue(Number(years) || 1);
  sheet.getRange(rowIndex, 5).setValue(experience ? 'あり' : 'なし');
  sheet.getRange(rowIndex, 6).setValue(isOrganizer ? 'はい' : 'いいえ');
  return { success: true, message: '更新しました' };
}

function deleteEventMember(memberId) {
  deleteRowsByMatch_('メンバー', 0, memberId);
  return { success: true, message: 'メンバーを削除しました' };
}

// 一括登録（改行区切りの名前リスト）
function bulkAddMembers(eventId, nameList, defaultYears) {
  var names = nameList.split('\n').map(function(n) { return n.trim(); }).filter(function(n) { return n; });
  if (names.length === 0) return { success: false, message: '名前を入力してください' };

  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('メンバー');
  var count = 0;
  names.forEach(function(name) {
    var id = generateId_();
    sheet.appendRow([id, eventId, name, Number(defaultYears) || 1, 'なし', 'いいえ']);
    count++;
  });
  return { success: true, message: count + '人を登録しました' };
}

/**
 * メンバーをまとめて一括登録する（キュー方式用）
 * @param {string} eventId - イベントID
 * @param {Object[]} memberDataList - メンバーデータの配列
 *   各要素: { name: string, years: number, exp: boolean, org: boolean }
 * @return {{ success: boolean, message: string }}
 */
function bulkAddMembersFromQueue(eventId, memberDataList) {
  if (!memberDataList || memberDataList.length === 0) {
    return { success: false, message: '登録するメンバーがいません' };
  }

  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('メンバー');
  var count = 0;
  memberDataList.forEach(function(m) {
    if (!m.name || !m.name.trim()) return;
    var id = generateId_();
    sheet.appendRow([
      id,
      eventId,
      m.name.trim(),
      Number(m.years) || 1,
      m.exp ? 'あり' : 'なし',
      m.org ? 'はい' : 'いいえ'
    ]);
    count++;
  });
  return { success: true, message: count + '人を登録しました' };
}
