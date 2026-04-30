// ===================================
// メンバー管理
// ===================================

function getMembers() {
  return getSheetData_('メンバー');
}

function addMember(name, years, experience, isOrganizer) {
  if (!name || !name.trim()) return { success: false, message: '名前を入力してください' };
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('メンバー');
  const id = generateId_();
  const now = new Date();
  sheet.appendRow([
    id,
    name.trim(),
    Number(years) || 1,
    experience ? 'あり' : 'なし',
    isOrganizer ? 'はい' : 'いいえ',
    now
  ]);
  return { success: true, message: name.trim() + ' を登録しました', id: id };
}

function updateMember(memberId, name, years, experience, isOrganizer) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('メンバー');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === memberId) {
      sheet.getRange(i + 1, 2).setValue(name.trim());
      sheet.getRange(i + 1, 3).setValue(Number(years) || 1);
      sheet.getRange(i + 1, 4).setValue(experience ? 'あり' : 'なし');
      sheet.getRange(i + 1, 5).setValue(isOrganizer ? 'はい' : 'いいえ');
      return { success: true, message: '更新しました' };
    }
  }
  return { success: false, message: 'メンバーが見つかりません' };
}

function deleteMember(memberId) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('メンバー');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === memberId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'メンバーを削除しました' };
    }
  }
  return { success: false, message: 'メンバーが見つかりません' };
}
