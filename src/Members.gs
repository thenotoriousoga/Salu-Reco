// ===================================
// メンバー管理（イベントに紐づく）
// ===================================

function getEventMembers(eventId) {
  return getSheetData_('メンバー').filter(function(m) {
    return m['イベントID'] === eventId;
  });
}

function deleteEventMember(memberId) {
  deleteRowsByMatch_('メンバー', 0, memberId);
  return { success: true, message: 'メンバーを削除しました' };
}

/**
 * メンバーをまとめて一括登録する（キュー方式用）
 * @param {string} eventId - イベントID
 * @param {Object[]} memberDataList - メンバーデータの配列
 *   各要素: { name: string, years: number, exp: boolean, org: boolean, note: string }
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
      m.org ? 'はい' : 'いいえ',
      (m.note || '').trim()
    ]);
    count++;
  });
  return { success: true, message: count + '人を登録しました' };
}
