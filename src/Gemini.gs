// ===================================
// Gemini API 連携
// プロンプト送信・レスポンス取得
// ===================================

/**
 * Gemini API にプロンプトを送信してテキスト応答を取得する
 * スクリプトプロパティ GEMINI_API_KEY が必要
 * @param {string} systemPrompt - システムインストラクション（ロール・ルール・出力仕様）
 * @param {string} userPrompt - ユーザーメッセージ（入力データ・指示）
 * @return {string|null} レスポンステキスト。失敗時は null
 */
function callGemini_(systemPrompt, userPrompt) {
  return callGeminiWithMimeType_(systemPrompt, userPrompt, 'application/json', 'gemini-2.5-pro', 0.9);
}

/**
 * Gemini API にプロンプトを送信してプレーンテキスト応答を取得する
 * JSON形式を強制しない（解説コメントなどテキスト出力用）
 * @param {string} prompt - プロンプト文字列
 * @return {string|null} レスポンステキスト。失敗時は null
 */
function callGeminiText_(prompt) {
  return callGeminiWithMimeType_(null, prompt, 'text/plain', 'gemini-2.5-flash-lite', 0.7);
}

/**
 * Gemini API にプロンプトを送信して応答を取得する（内部共通処理）
 * @param {string|null} systemPrompt - システムインストラクション（null の場合は省略）
 * @param {string} userPrompt - ユーザーメッセージ
 * @param {string} mimeType - レスポンスのMIMEタイプ
 * @param {string} model - モデル名
 * @param {number} [temperature] - 温度パラメータ（省略時は0.7）
 * @return {string|null} レスポンステキスト。失敗時は null
 */
function callGeminiWithMimeType_(systemPrompt, userPrompt, mimeType, model, temperature) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    Logger.log('GEMINI_API_KEY が設定されていません');
    return null;
  }

  var temp = (typeof temperature === 'number') ? temperature : 0.7;
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
  var payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: temp,
      responseMimeType: mimeType,
      maxOutputTokens: 65536
    }
  };

  // systemInstruction が指定されている場合のみ追加
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  var maxAttempts = 5;
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
        var candidate = json.candidates[0];

        // 出力が途中で切れていないかチェック
        var finishReason = candidate.finishReason;
        if (finishReason && finishReason !== 'STOP') {
          Logger.log('Gemini 出力が不完全です（finishReason: ' + finishReason + '）');
          if (attempt < maxAttempts) {
            Logger.log('リトライします（' + attempt + '/' + maxAttempts + '）...');
            Utilities.sleep(3000);
            continue;
          }
          return null;
        }

        return candidate.content.parts[0].text;
      }

      Logger.log('Gemini API エラー: ' + code + ' ' + res.getContentText());

      // 503（高負荷）または 429（レートリミット）の場合リトライ
      if ((code === 503 || code === 429) && attempt < maxAttempts) {
        var waitTime = code === 429 ? 10000 : 5000;
        Logger.log('リトライします（' + attempt + '/' + maxAttempts + '）... ' + waitTime + 'ms 待機');
        Utilities.sleep(waitTime);
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
