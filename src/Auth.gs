// ===================================
// 認証・ロール管理
// 管理者パスワード認証、イベントコード認証
// ===================================

/**
 * 管理者パスワードで認証する
 * @param {string} password - 入力されたパスワード
 * @return {Object} 結果オブジェクト { success, role, message }
 */
function loginAdmin(password) {
  var adminPassword = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');

  if (!adminPassword) {
    return {
      success: false,
      message: '管理者パスワードが設定されていません。スクリプトプロパティ ADMIN_PASSWORD を設定してください。'
    };
  }

  if (String(password).trim() === String(adminPassword).trim()) {
    return { success: true, role: 'admin' };
  }

  return { success: false, message: 'パスワードが正しくありません' };
}

/**
 * イベントコードでイベントを検索する
 * @param {string} code - イベントコード
 * @return {Object} 結果オブジェクト { success, role, eventId, message }
 */
function loginWithCode(code) {
  if (!code || !String(code).trim()) {
    return { success: false, message: 'コードを入力してください' };
  }

  var codeStr = String(code).trim().toUpperCase();
  var events = getSheetData_('イベント');
  var found = events.find(function(e) {
    return String(e['コード']).toUpperCase() === codeStr;
  });

  if (!found) {
    return { success: false, message: 'イベントが見つかりません。コードを確認してください。' };
  }

  return { success: true, role: 'user', eventId: found['イベントID'] };
}
