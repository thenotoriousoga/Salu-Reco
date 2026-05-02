// ===================================
// アンケート（Googleフォーム連携）
// Googleフォーム自動生成、アンケート回答取得
// ===================================

// ===================================
// フォーム作成
// ===================================

/**
 * MVPアンケートフォームを作成する
 * 既存フォームがある場合は再作成（メンバー追加対応）
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, formUrl, message }
 */
function createSurveyForm(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  // イベントのメンバー取得
  var members = getEventMembers(eventId);
  var names = members.map(function(m) { return m['名前']; }).filter(Boolean);

  if (names.length === 0) {
    return { success: false, message: 'メンバーがいません。先にメンバーを登録してください。' };
  }

  // 既存フォームがある場合は削除
  if (event['フォームID']) {
    try {
      DriveApp.getFileById(event['フォームID']).setTrashed(true);
    } catch (e) {
      // フォームが見つからない場合は無視
    }
  }

  // Googleフォーム作成
  var form = FormApp.create(event['名称'] + ' - MVPアンケート');
  form.setDescription(
    'お疲れさまでした！\n' +
    '各メンバーへのコメントを自由に記入してください。\n' +
    '（MVPが誰かは記載しないでください。AIが総合的に判断します）'
  );
  form.setConfirmationMessage('回答ありがとうございました！');

  // 回答者名（プルダウン）
  var voterItem = form.addListItem();
  voterItem.setTitle('あなたの名前');
  voterItem.setChoiceValues(names);
  voterItem.setRequired(true);

  // 各メンバーへのコメント（任意）
  names.forEach(function(name) {
    var textItem = form.addParagraphTextItem();
    textItem.setTitle(name + ' へのコメント');
    textItem.setRequired(false);
    textItem.setHelpText('プレーの感想、良かった点など自由に記入してください（任意）');
  });

  var formUrl = form.getPublishedUrl();
  var formId = form.getId();

  // イベントにフォーム情報を保存
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 7).setValue(formUrl);
    sheet.getRange(rowIndex, 8).setValue(formId);
  }

  // 既存の回答データをクリア（再作成時）
  deleteRowsByMatch_('アンケート回答', 0, eventId);

  var isRecreate = !!event['フォームID'];
  var message = isRecreate ? 'アンケートフォームを再作成しました' : 'アンケートフォームを作成しました';
  return { success: true, formUrl: formUrl, message: message };
}

// ===================================
// 回答取得
// ===================================

/**
 * アンケート回答を取得してスプレッドシートに保存する
 * 同じ回答者の既存回答は上書きする
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message, responseCount, commentCount, voters }
 */
function fetchSurveyResponses(eventId) {
  var event = findEvent_(eventId);
  if (!event || !event['フォームID']) {
    return { success: false, message: 'アンケートフォームが見つかりません' };
  }

  var form = FormApp.openById(event['フォームID']);
  var responses = form.getResponses();

  if (responses.length === 0) {
    return { success: true, message: 'まだ回答がありません', responseCount: 0, commentCount: 0, voters: [] };
  }

  // メンバー名→IDマップ
  var members = getEventMembers(eventId);
  var nameToId = {};
  members.forEach(function(m) { nameToId[m['名前']] = m['メンバーID']; });

  // 既存回答をクリア
  deleteRowsByMatch_('アンケート回答', 0, eventId);

  var ss = getSpreadsheet_();
  var surveySheet = ensureSheet_(ss, 'アンケート回答');
  var totalComments = 0;
  var voterNames = [];

  // 同じ回答者の最新回答のみを使用（タイムスタンプでソート）
  var latestResponses = {};
  responses.forEach(function(response) {
    var itemResponses = response.getItemResponses();
    var voterName = '';
    itemResponses.forEach(function(ir) {
      if (ir.getItem().getTitle() === 'あなたの名前') {
        voterName = String(ir.getResponse());
      }
    });
    if (voterName) {
      var timestamp = response.getTimestamp().getTime();
      if (!latestResponses[voterName] || latestResponses[voterName].timestamp < timestamp) {
        latestResponses[voterName] = { response: response, timestamp: timestamp };
      }
    }
  });

  // 最新回答のみを保存
  Object.keys(latestResponses).forEach(function(voterName) {
    var response = latestResponses[voterName].response;
    var itemResponses = response.getItemResponses();
    voterNames.push(voterName);

    itemResponses.forEach(function(ir) {
      var title = ir.getItem().getTitle();
      if (title === 'あなたの名前') return;

      var comment = String(ir.getResponse() || '').trim();
      if (comment) {
        var targetName = title.replace(' へのコメント', '');
        var targetId = nameToId[targetName] || '';
        surveySheet.appendRow([eventId, voterName, targetId, targetName, comment]);
        totalComments++;
      }
    });
  });

  return {
    success: true,
    message: voterNames.length + '人の回答から' + totalComments + '件のコメントを取得しました',
    responseCount: voterNames.length,
    commentCount: totalComments,
    voters: voterNames
  };
}

/**
 * アンケート回答者一覧を取得する
 * @param {string} eventId - イベントID
 * @return {string[]} 回答者名の配列
 */
function getSurveyVoters(eventId) {
  var event = findEvent_(eventId);
  if (!event || !event['フォームID']) {
    return [];
  }

  try {
    var form = FormApp.openById(event['フォームID']);
    var responses = form.getResponses();
    var voterSet = {};

    responses.forEach(function(response) {
      var itemResponses = response.getItemResponses();
      itemResponses.forEach(function(ir) {
        if (ir.getItem().getTitle() === 'あなたの名前') {
          voterSet[String(ir.getResponse())] = true;
        }
      });
    });

    return Object.keys(voterSet);
  } catch (e) {
    return [];
  }
}
