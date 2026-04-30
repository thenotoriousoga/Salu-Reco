// ===================================
// アンケート（Googleフォーム連携）
// ===================================

// --- アンケートフォーム生成 ---
function createSurveyForm(eventId) {
  const events = getSheetData_('イベント');
  const event = events.find(e => e['イベントID'] === eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  // イベントに参加したメンバーを取得（全ラウンドの参加者）
  const rounds = getSheetData_('ラウンド').filter(r => r['イベントID'] === eventId);
  const roundIds = rounds.map(r => r['ラウンドID']);
  const roundMembers = getSheetData_('ラウンドメンバー');
  const memberIds = [...new Set(
    roundMembers.filter(rm => roundIds.includes(rm['ラウンドID'])).map(rm => rm['メンバーID'])
  )];

  const members = getSheetData_('メンバー');
  const memberMap = {};
  members.forEach(m => { memberMap[m['ID']] = m['名前']; });

  const participantNames = memberIds.map(id => memberMap[id]).filter(Boolean);

  if (participantNames.length === 0) {
    return { success: false, message: '参加メンバーがいません。先に試合を作成してください。' };
  }

  // Googleフォーム作成
  const form = FormApp.create(event['名称'] + ' - MVPアンケート');
  form.setDescription(
    'お疲れさまでした！\n' +
    '各メンバーへのコメントを自由に記入してください。\n' +
    '（MVPの選出には記載しないでください。AIが総合的に判断します）'
  );
  form.setConfirmationMessage('回答ありがとうございました！');

  // 回答者名（プルダウン）
  const voterItem = form.addListItem();
  voterItem.setTitle('あなたの名前');
  voterItem.setChoiceValues(participantNames);
  voterItem.setRequired(true);

  // 各メンバーへのコメント（任意）
  participantNames.forEach(name => {
    const textItem = form.addParagraphTextItem();
    textItem.setTitle(name + ' へのコメント');
    textItem.setRequired(false);
    textItem.setHelpText('プレーの感想、良かった点など自由に記入してください（任意）');
  });

  const formUrl = form.getPublishedUrl();
  const formId = form.getId();

  // イベントにフォーム情報を保存
  const ss = getSpreadsheet_();
  const sheet = getSheet_('イベント', ss);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.getRange(i + 1, 7).setValue(formUrl);
      sheet.getRange(i + 1, 8).setValue(formId);
      break;
    }
  }

  return { success: true, formUrl: formUrl, message: 'アンケートフォームを作成しました' };
}

// --- アンケート回答を取得してシートに保存 ---
function fetchSurveyResponses(eventId) {
  const events = getSheetData_('イベント');
  const event = events.find(e => e['イベントID'] === eventId);
  if (!event || !event['フォームID']) {
    return { success: false, message: 'アンケートフォームが見つかりません' };
  }

  const form = FormApp.openById(event['フォームID']);
  const responses = form.getResponses();
  const items = form.getItems();

  // 参加メンバー情報
  const rounds = getSheetData_('ラウンド').filter(r => r['イベントID'] === eventId);
  const roundIds = rounds.map(r => r['ラウンドID']);
  const roundMembers = getSheetData_('ラウンドメンバー');
  const memberIds = [...new Set(
    roundMembers.filter(rm => roundIds.includes(rm['ラウンドID'])).map(rm => rm['メンバーID'])
  )];
  const members = getSheetData_('メンバー');
  const memberMap = {};
  members.forEach(m => { memberMap[m['名前']] = m['ID']; });

  // 既存回答をクリア
  const ss = getSpreadsheet_();
  const surveySheet = getSheet_('アンケート回答', ss);
  const existingData = surveySheet.getDataRange().getValues();
  for (let i = existingData.length - 1; i >= 1; i--) {
    if (existingData[i][0] === eventId) {
      surveySheet.deleteRow(i + 1);
    }
  }

  // 回答を解析して保存
  let totalComments = 0;
  responses.forEach(response => {
    const itemResponses = response.getItemResponses();
    let voterName = '';

    // 最初の回答が投票者名
    if (itemResponses.length > 0) {
      voterName = String(itemResponses[0].getResponse());
    }

    // 2番目以降がメンバーへのコメント
    for (let j = 1; j < itemResponses.length; j++) {
      const comment = String(itemResponses[j].getResponse() || '').trim();
      if (comment) {
        const title = itemResponses[j].getItem().getTitle();
        // 「○○ へのコメント」から名前を抽出
        const targetName = title.replace(' へのコメント', '');
        const targetId = memberMap[targetName] || '';
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

// --- アンケート結果取得 ---
function getSurveyResults(eventId) {
  const comments = getSheetData_('アンケート回答').filter(c => c['イベントID'] === eventId);

  // メンバーごとにコメントをグループ化
  const grouped = {};
  comments.forEach(c => {
    const key = c['対象メンバーID'] || c['対象メンバー名'];
    if (!grouped[key]) {
      grouped[key] = {
        memberId: c['対象メンバーID'],
        name: c['対象メンバー名'],
        comments: []
      };
    }
    grouped[key].comments.push({
      from: c['回答者名'],
      comment: c['コメント']
    });
  });

  return Object.values(grouped);
}
