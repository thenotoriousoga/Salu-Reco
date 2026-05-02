// ===================================
// アンケート（Googleフォーム連携）
// ===================================

function createSurveyForm(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  // イベントのメンバー取得
  var members = getEventMembers(eventId);
  var names = members.map(function(m) { return m['名前']; }).filter(Boolean);

  if (names.length === 0) {
    return { success: false, message: 'メンバーがいません。先にメンバーを登録してください。' };
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

  return { success: true, formUrl: formUrl, message: 'アンケートフォームを作成しました' };
}

function fetchSurveyResponses(eventId) {
  var event = findEvent_(eventId);
  if (!event || !event['フォームID']) {
    return { success: false, message: 'アンケートフォームが見つかりません' };
  }

  var form = FormApp.openById(event['フォームID']);
  var responses = form.getResponses();

  if (responses.length === 0) {
    return { success: true, message: 'まだ回答がありません', responseCount: 0, commentCount: 0 };
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

  responses.forEach(function(response) {
    var itemResponses = response.getItemResponses();
    var voterName = '';

    // 投票者名を探す（タイトルで判定）
    itemResponses.forEach(function(ir) {
      if (ir.getItem().getTitle() === 'あなたの名前') {
        voterName = String(ir.getResponse());
      }
    });

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
    message: responses.length + '件の回答から' + totalComments + '件のコメントを取得しました',
    responseCount: responses.length,
    commentCount: totalComments
  };
}


