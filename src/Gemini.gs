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
  return callGeminiWithMimeType_(prompt, 'application/json', 'gemini-2.5-pro');
}

/**
 * Gemini API にプロンプトを送信してプレーンテキスト応答を取得する
 * JSON形式を強制しない（解説コメントなどテキスト出力用）
 * @param {string} prompt - プロンプト文字列
 * @return {string|null} レスポンステキスト。失敗時は null
 */
function callGeminiText_(prompt) {
  return callGeminiWithMimeType_(prompt, 'text/plain', 'gemini-2.5-flash');
}

/**
 * Gemini API にプロンプトを送信して応答を取得する（内部共通処理）
 * @param {string} prompt - プロンプト文字列
 * @param {string} mimeType - レスポンスのMIMEタイプ
 * @param {string} model - モデル名
 * @return {string|null} レスポンステキスト。失敗時は null
 */
function callGeminiWithMimeType_(prompt, mimeType, model) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    Logger.log('GEMINI_API_KEY が設定されていません');
    return null;
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: mimeType
    }
  };

  var maxAttempts = 2;
  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      var res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var code = res.getResponseCode();
      if (code === 200) {
        var json = JSON.parse(res.getContentText());
        return json.candidates[0].content.parts[0].text;
      }

      Logger.log('Gemini API エラー: ' + code + ' ' + res.getContentText());

      // 503（高負荷）の場合、1回だけリトライ
      if (code === 503 && attempt < maxAttempts) {
        Logger.log('リトライします（' + attempt + '/' + maxAttempts + '）...');
        Utilities.sleep(5000);
        continue;
      }

      return null;
    } catch (e) {
      Logger.log('Gemini API 呼び出し失敗: ' + e.message);
      if (attempt < maxAttempts) {
        Utilities.sleep(5000);
        continue;
      }
      return null;
    }
  }
  return null;
}
