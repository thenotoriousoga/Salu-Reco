// ===================================
// メンバー管理（イベントに紐づく）
// メンバーCRUD（一括登録対応）
// ===================================

// ===================================
// メンバー取得
// ===================================

/**
 * イベントに紐づくメンバー一覧を取得する
 * @param {string} eventId - イベントID
 * @return {Object[]} メンバー配列
 */
function getEventMembers(eventId) {
  return getSheetData_('メンバー').filter(function(m) {
    return m['イベントID'] === eventId;
  });
}

// ===================================
// メンバー登録
// ===================================

/**
 * メンバーをまとめて一括登録する（キュー方式用）
 * @param {string} eventId - イベントID
 * @param {Object[]} memberDataList - メンバーデータの配列
 *   各要素: { name: string, years: number, exp: boolean, org: boolean, note: string }
 * @return {Object} 結果オブジェクト { success, message }
 */
function bulkAddMembersFromQueue(eventId, memberDataList) {
  if (!memberDataList || memberDataList.length === 0) {
    return { success: false, message: '登録するメンバーがいません' };
  }

  // 有効なメンバーデータを行配列に変換
  var rows = [];
  memberDataList.forEach(function(m) {
    if (!m.name || !m.name.trim()) return;
    rows.push([
      generateId_(),
      eventId,
      m.name.trim(),
      Number(m.years) || 1,
      m.exp ? 'あり' : 'なし',
      m.org ? 'はい' : 'いいえ',
      (m.note || '').trim()
    ]);
  });

  if (rows.length === 0) {
    return { success: false, message: '登録するメンバーがいません' };
  }

  // 一括書き込み（appendRowの繰り返しより高速）
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('メンバー');
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);

  return { success: true, message: rows.length + '人を登録しました' };
}

// ===================================
// メンバー削除
// ===================================

/**
 * メンバーを削除する
 * @param {string} memberId - メンバーID
 * @return {Object} 結果オブジェクト { success, message }
 */
function deleteEventMember(memberId) {
  deleteRowsByMatch_('メンバー', 0, memberId);
  return { success: true, message: 'メンバーを削除しました' };
}
