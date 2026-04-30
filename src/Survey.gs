// ===================================
// アンケート（Googleフォーム連携）
// ===================================

function createSurveyForm(eventId) {
  var events = getSheetData_('イベント');
  var event = events.find(function(e) { return e['イベントID'] === eventId; });
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
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.getRange(i + 1, 7).setValue(formUrl);
      sheet.getRange(i + 1, 8).setValue(formId);
      break;
    }
  }

  return { success: true, formUrl: formUrl, message: 'アンケートフォームを作成しました' };
}

function fetchSurveyResponses(eventId) {
  var events = getSheetData_('イベント');
  var event = events.find(function(e) { return e['イベントID'] === eventId; });
  if (!event || !event['フォームID']) {
    return { success: false, message: 'アンケートフォームが見つかりません' };
  }

  var form = FormApp.openById(event['フォームID']);
  var responses = form.getResponses();

  // メンバー名→IDマップ
  var members = getEventMembers(eventId);
  var nameToId = {};
  members.forEach(function(m) { nameToId[m['名前']] = m['メンバーID']; });

  // 既存回答をクリア
  deleteRowsByMatch_('アンケート回答', 0, eventId);

  var ss = getSpreadsheet_();
  var surveySheet = ss.getSheetByName('アンケート回答');
  var totalComments = 0;

  responses.forEach(function(response) {
    var itemResponses = response.getItemResponses();
    var voterName = '';

    if (itemResponses.length > 0) {
      voterName = String(itemResponses[0].getResponse());
    }

    for (var j = 1; j < itemResponses.length; j++) {
      var comment = String(itemResponses[j].getResponse() || '').trim();
      if (comment) {
        var title = itemResponses[j].getItem().getTitle();
        var targetName = title.replace(' へのコメント', '');
        var targetId = nameToId[targetName] || '';
        surveySheet.appendRow([eventId, voterName, targetId, targetName, comment]);
        totalComments++;
      }
    }
  });

  return {
    success: true,
    message: responses.length + '件の回答から' + totalComments + '件のコメントを取得しました',
    responseCount: responses.length,
    commentCount: totalComments
  };
}

function getSurveyResults(eventId) {
  var comments = getSheetData_('アンケート回答').filter(function(c) { return c['イベントID'] === eventId; });
  var grouped = {};
  comments.forEach(function(c) {
    var key = c['対象メンバーID'] || c['対象メンバー名'];
    if (!grouped[key]) {
      grouped[key] = { memberId: c['対象メンバーID'], name: c['対象メンバー名'], comments: [] };
    }
    grouped[key].comments.push({ from: c['回答者名'], comment: c['コメント'] });
  });
  return Object.values(grouped);
}
