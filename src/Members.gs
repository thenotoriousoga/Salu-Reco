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

// ===================================
// メンバー更新
// ===================================

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

  // 各フィールドを更新（列: メンバーID, イベントID, 名前, 年次, サッカー経験, 幹事, 備考）
  sheet.getRange(rowIndex, 3).setValue(data.name.trim());           // 名前
  sheet.getRange(rowIndex, 4).setValue(Number(data.years) || 1);    // 年次
  sheet.getRange(rowIndex, 5).setValue(data.exp ? 'あり' : 'なし'); // サッカー経験
  sheet.getRange(rowIndex, 6).setValue(data.org ? 'はい' : 'いいえ'); // 幹事
  sheet.getRange(rowIndex, 7).setValue((data.note || '').trim());   // 備考

  return { success: true, message: 'メンバー情報を更新しました' };
}
