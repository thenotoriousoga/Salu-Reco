// ===================================
// Gemini API 連携
// プロンプト送信・レスポンス取得
// ===================================

/**
 * Gemini API にプロンプトを送信してテキスト応答を取得する
 * スクリプトプロパティ GEMINI_API_KEY が必要
 * @param {string} prompt - プロンプト文字列
 * @return {string|null} レスポンステキスト。失敗時は null
 */
function callGemini_(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    Logger.log('GEMINI_API_KEY が設定されていません');
    return null;
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=' + apiKey;
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  };

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    if (code !== 200) {
      Logger.log('Gemini API エラー: ' + code + ' ' + res.getContentText());
      return null;
    }

    var json = JSON.parse(res.getContentText());
    return json.candidates[0].content.parts[0].text;
  } catch (e) {
    Logger.log('Gemini API 呼び出し失敗: ' + e.message);
    return null;
  }
}
