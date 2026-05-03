// ===================================
// メンバー管理（イベントに紐づく）
// メンバーCRUD（一括登録対応）
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

  var ss = getSpreadsheet_();
  appendRows_(ss.getSheetByName('メンバー'), rows);

  return { success: true, message: rows.length + '人を登録しました' };
}

/**
 * メンバーを削除する
 * @param {string} memberId - メンバーID
 * @return {Object} 結果オブジェクト { success, message }
 */
function deleteEventMember(memberId) {
  deleteRowsByMatch_('メンバー', 0, memberId);
  return { success: true, message: 'メンバーを削除しました' };
}

/**
 * メンバー情報を更新する
 * @param {string} memberId - メンバーID
 * @param {Object} data - 更新データ { name, years, exp, org, note }
 * @return {Object} 結果オブジェクト { success, message }
 */
function updateMember(memberId, data) {
  if (!memberId) {
    return { success: false, message: 'メンバーIDが指定されていません' };
  }
  if (!data.name || !data.name.trim()) {
    return { success: false, message: '名前を入力してください' };
  }

  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('メンバー');
  var rowIndex = findRowIndex_(sheet, 0, memberId);
  if (rowIndex === -1) {
    return { success: false, message: 'メンバーが見つかりません' };
  }

  // 名前〜備考（3〜7列目）を一括更新
  var values = [
    data.name.trim(),
    Number(data.years) || 1,
    data.exp ? 'あり' : 'なし',
    data.org ? 'はい' : 'いいえ',
    (data.note || '').trim()
  ];
  sheet.getRange(rowIndex, 3, 1, values.length).setValues([values]);

  return { success: true, message: 'メンバー情報を更新しました' };
}
