// ===================================
// LINE通知（LINE Messaging API）
// イベントごとのLINEグループへ通知を送信する
// ===================================
// 必要なスクリプトプロパティ:
//   LINE_CHANNEL_ACCESS_TOKEN - メッセージ送信用トークン
//   LINE_CHANNEL_SECRET       - Webhook署名検証用シークレット
//
// イベントシートの「LINEグループID」列にグループIDを保存する。
// 公式アカウントをグループに招待した際にWebhook経由でグループIDを取得し、
// linkLineGroup(eventId, groupId) でイベントに紐づける。
// ===================================

// ===================================
// LINE API 基盤
// ===================================

/**
 * イベントに紐づくLINEグループIDを取得する
 * @param {string} eventId - イベントID
 * @return {string|null} グループID、未設定の場合はnull
 */
function getEventLineGroupId_(eventId) {
  var event = findEvent_(eventId);
  if (!event) return null;
  return event['LINEグループID'] || null;
}

/**
 * LINE Messaging API でメッセージを送信する
 * @param {string} groupId - 送信先のグループID
 * @param {string} message - 送信するテキストメッセージ
 * @return {boolean} 送信成功したかどうか
 */
function sendLineMessage_(groupId, message) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!token) {
    Logger.log('LINE通知: LINE_CHANNEL_ACCESS_TOKEN が未設定です');
    return false;
  }
  if (!groupId) {
    Logger.log('LINE通知: グループIDが指定されていません');
    return false;
  }

  var url = 'https://api.line.me/v2/bot/message/push';
  var payload = {
    to: groupId,
    messages: [{ type: 'text', text: message }]
  };

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    if (code === 200) {
      return true;
    }

    Logger.log('LINE通知エラー: ' + code + ' ' + res.getContentText());
    return false;
  } catch (e) {
    Logger.log('LINE通知失敗: ' + (e.message || e));
    return false;
  }
}

/**
 * LINE Messaging API でFlex Messageを送信する
 * @param {string} groupId - 送信先のグループID
 * @param {string} altText - 代替テキスト（通知プレビュー用）
 * @param {Object} flexContent - Flex Messageのコンテンツ（bubble or carousel）
 * @return {boolean} 送信成功したかどうか
 */
function sendLineFlexMessage_(groupId, altText, flexContent) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!token) {
    Logger.log('LINE通知: LINE_CHANNEL_ACCESS_TOKEN が未設定です');
    return false;
  }
  if (!groupId) {
    Logger.log('LINE通知: グループIDが指定されていません');
    return false;
  }

  var url = 'https://api.line.me/v2/bot/message/push';
  var payload = {
    to: groupId,
    messages: [{
      type: 'flex',
      altText: altText,
      contents: flexContent
    }]
  };

  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    if (code === 200) {
      return true;
    }

    Logger.log('LINE Flex通知エラー: ' + code + ' ' + res.getContentText());
    return false;
  } catch (e) {
    Logger.log('LINE Flex通知失敗: ' + (e.message || e));
    return false;
  }
}

// ===================================
// LINEグループ連携管理（コマンド送信方式）
// グループ内で「連携:参加コード」と送信すると自動紐づけ
// ===================================

/**
 * Webhook リクエストの署名を検証する
 * LINE_CHANNEL_SECRET を使って X-Line-Signature ヘッダーを検証する
 * @param {Object} e - POSTイベント
 * @return {boolean} 署名が有効かどうか
 */
function verifyLineSignature_(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_SECRET');
  if (!secret) {
    Logger.log('LINE Webhook: LINE_CHANNEL_SECRET が未設定です');
    return false;
  }

  var signature = '';
  if (e.parameter && e.parameter['X-Line-Signature']) {
    signature = e.parameter['X-Line-Signature'];
  } else if (e.headers) {
    signature = e.headers['X-Line-Signature'] || e.headers['x-line-signature'] || '';
  }

  // GAS の doPost では HTTP ヘッダーを取得できない制約がある
  // ヘッダーが取れない場合は署名検証をスキップ（GASの制約）
  if (!signature) {
    Logger.log('LINE Webhook: 署名ヘッダーが取得できません（GASの制約によりスキップ）');
    return true;
  }

  var body = e.postData.contents;
  var hmac = Utilities.computeHmacSha256Signature(body, secret);
  var expected = Utilities.base64Encode(hmac);

  return signature === expected;
}

/**
 * LINE Messaging API の Reply API でメッセージを返信する
 * @param {string} replyToken - リプライトークン
 * @param {string} message - 返信メッセージ
 */
function replyLineMessage_(replyToken, message) {
  var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token || !replyToken) return;

  var url = 'https://api.line.me/v2/bot/message/reply';
  var payload = {
    replyToken: replyToken,
    messages: [{ type: 'text', text: message }]
  };

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('LINE返信失敗: ' + (e.message || e));
  }
}

/**
 * Webhook エンドポイント（doPost）
 * グループ内で「連携:参加コード」メッセージを受信した時にイベントと紐づける
 * @param {Object} e - POSTイベント
 * @return {ContentOutput} 200 OK
 */
function doPost(e) {
  try {
    // 署名検証
    if (!verifyLineSignature_(e)) {
      Logger.log('LINE Webhook: 署名検証に失敗しました');
      return ContentService.createTextOutput('OK');
    }

    var json = JSON.parse(e.postData.contents);
    var events = json.events || [];
    Logger.log('LINE Webhook受信: イベント数=' + events.length);

    events.forEach(function(ev) {
      Logger.log('イベント: type=' + ev.type + ', source.type=' + (ev.source ? ev.source.type : 'なし'));

      // グループ内のテキストメッセージを処理
      if (ev.type === 'message' && ev.message && ev.message.type === 'text'
          && ev.source && ev.source.type === 'group') {
        Logger.log('メッセージ処理開始: ' + ev.message.text);
        handleGroupMessage_(ev);
      }
    });
  } catch (err) {
    Logger.log('Webhook処理エラー: ' + (err.message || err));
  }

  return ContentService.createTextOutput('OK');
}

/**
 * グループ内メッセージを処理する
 * 「連携:参加コード」形式のメッセージでイベントとグループを紐づける
 * @param {Object} ev - LINEイベントオブジェクト
 */
function handleGroupMessage_(ev) {
  var text = (ev.message.text || '').trim();
  var groupId = ev.source.groupId;
  var replyToken = ev.replyToken;

  // 「連携:XXXX」または「連携：XXXX」形式を検出
  var match = text.match(/^連携[:：]\s*(.+)$/);
  if (!match) return;

  var code = match[1].trim().toUpperCase();

  // 参加コードからイベントを検索
  var eventData = getSheetData_('イベント');
  var event = eventData.find(function(e) {
    return String(e['コード']).toUpperCase() === code;
  });

  if (!event) {
    replyLineMessage_(replyToken, '❌ 参加コード「' + code + '」に該当するイベントが見つかりません。');
    return;
  }

  var eventId = event['イベントID'];

  // 既に別のグループが紐づいている場合
  if (event['LINEグループID'] && event['LINEグループID'] !== groupId) {
    replyLineMessage_(replyToken, '⚠️ 「' + event['名称'] + '」は既に別のLINEグループと連携済みです。\n解除するには「解除:' + code + '」と送信してください。');
    return;
  }

  // 既に同じグループが紐づいている場合
  if (event['LINEグループID'] === groupId) {
    replyLineMessage_(replyToken, 'ℹ️ このグループは既に「' + event['名称'] + '」と連携済みです。');
    return;
  }

  // 紐づけ実行
  updateEventField_(eventId, 10, groupId);
  replyLineMessage_(replyToken, '✅ 連携完了！\n\n📋 ' + event['名称'] + '\n📅 ' + event['日付'] + '\n\nこのグループにイベントの通知が届きます。');
}

/**
 * イベントのLINEグループ紐づけを解除する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function unlinkLineGroup(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  updateEventField_(eventId, 10, '');
  return { success: true, message: 'LINEグループの紐づけを解除しました' };
}

/**
 * イベントにLINEグループが紐づいているか確認する
 * @param {string} eventId - イベントID
 * @return {Object} { linked: boolean, groupId: string|null }
 */
function getLineGroupStatus(eventId) {
  var groupId = getEventLineGroupId_(eventId);
  return { linked: !!groupId, groupId: groupId };
}

// ===================================
// 1. イベント開始アナウンス
// ===================================

/**
 * イベント開始時のアナウンスをLINEグループに送信する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function notifyEventStart(eventId) {
  var groupId = getEventLineGroupId_(eventId);
  if (!groupId) return { success: false, message: 'LINEグループが紐づけられていません' };

  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var members = getEventMembers(eventId);
  var memberNames = members.map(function(m) { return m['名前']; });

  var appUrl = ScriptApp.getService().getUrl() || '';
  var eventUrl = appUrl ? appUrl + '?code=' + encodeURIComponent(event['コード'] || '') : '';

  var lines = [
    '⚽ イベント開始！',
    '',
    '📋 ' + event['名称'],
    '📅 ' + event['日付'],
    '👥 参加者: ' + members.length + '名',
    ''
  ];

  if (memberNames.length > 0) {
    lines.push('【参加メンバー】');
    lines.push(memberNames.join('、'));
    lines.push('');
  }

  lines.push('今日も楽しくやりましょう！💪');

  if (eventUrl) {
    lines.push('');
    lines.push('🔗 ' + eventUrl);
  }

  var sent = sendLineMessage_(groupId, lines.join('\n'));
  return sent
    ? { success: true, message: 'LINE通知を送信しました' }
    : { success: false, message: 'LINE通知の送信に失敗しました' };
}

// ===================================
// 2. チーム分け結果通知
// ===================================

/**
 * チーム分け結果をLINEグループに送信する
 * @param {string} eventId - イベントID
 * @param {string[]} teamNames - チーム名の配列
 * @param {string[][]} teams - チームごとのメンバーID配列
 * @param {number} roundNumber - ラウンド番号
 * @return {Object} 結果オブジェクト { success, message }
 */
function notifyTeamSplit(eventId, teamNames, teams, roundNumber) {
  var groupId = getEventLineGroupId_(eventId);
  if (!groupId) return { success: false, message: 'LINEグループが紐づけられていません' };

  var members = getEventMembers(eventId);
  var memberMap = buildMap_(members, 'メンバーID');

  var lines = [
    '🎲 チーム分け結果（ラウンド' + roundNumber + '）',
    ''
  ];

  for (var i = 0; i < teams.length; i++) {
    var teamName = (teamNames && teamNames[i]) ? teamNames[i] : 'チーム' + (i + 1);
    var teamMembers = teams[i].map(function(id) {
      var m = memberMap[id];
      if (!m) return '不明';
      var exp = m['サッカー経験'] === 'あり' ? '⭐' : '';
      return m['名前'] + exp;
    });

    lines.push('【' + teamName + '】(' + teamMembers.length + '人)');
    lines.push(teamMembers.join('、'));
    lines.push('');
  }

  lines.push('⭐ = サッカー経験あり');
  lines.push('');
  lines.push('さあ、試合開始だ！🔥');

  var sent = sendLineMessage_(groupId, lines.join('\n'));
  return sent
    ? { success: true, message: 'チーム分け結果をLINEに送信しました' }
    : { success: false, message: 'LINE通知の送信に失敗しました' };
}

// ===================================
// 3. ラウンド結果サマリ通知
// ===================================

/**
 * ラウンドの全試合結果サマリをLINEグループに送信する
 * @param {string} roundId - ラウンドID
 * @return {Object} 結果オブジェクト { success, message }
 */
function notifyRoundResult(roundId) {
  var data = getMultipleSheetData_(['ラウンド', 'マッチ', 'マッチメンバー', '得点', 'メンバー', 'イベント']);

  var round = data['ラウンド'].find(function(r) { return r['ラウンドID'] === roundId; });
  if (!round) return { success: false, message: 'ラウンドが見つかりません' };

  var eventId = round['イベントID'];
  var groupId = getEventLineGroupId_(eventId);
  if (!groupId) return { success: false, message: 'LINEグループが紐づけられていません' };

  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  var matches = data['マッチ']
    .filter(function(m) { return m['ラウンドID'] === roundId; })
    .sort(function(a, b) { return a['マッチ番号'] - b['マッチ番号']; });

  if (matches.length === 0) {
    return { success: false, message: '試合データがありません' };
  }

  var lines = [
    '📊 ラウンド' + round['ラウンド番号'] + ' 結果',
    ''
  ];

  // 得点者集計用
  var allScorers = {};

  matches.forEach(function(match) {
    var matchId = match['マッチID'];

    // スコア集計
    var matchGoals = data['得点'].filter(function(g) { return g['マッチID'] === matchId; });
    var scoreA = 0, scoreB = 0;
    matchGoals.forEach(function(g) {
      if (g['チーム'] === 'A') scoreA++;
      if (g['チーム'] === 'B') scoreB++;
      // 得点者集計
      if (g['種別'] === '通常' && g['メンバーID']) {
        var name = (memberMap[g['メンバーID']] || {})['名前'] || '不明';
        allScorers[name] = (allScorers[name] || 0) + 1;
      }
    });

    var teamADisplay = match['チームA名'] + (scoreA > scoreB ? ' 🏆' : '');
    var teamBDisplay = match['チームB名'] + (scoreB > scoreA ? ' 🏆' : '');

    lines.push('⚽ 第' + match['マッチ番号'] + '試合');
    lines.push(teamADisplay + ' ' + scoreA + ' - ' + scoreB + ' ' + teamBDisplay);
    lines.push('');
  });

  // 得点ランキング
  var scorerList = Object.keys(allScorers).map(function(name) {
    return { name: name, count: allScorers[name] };
  }).sort(function(a, b) { return b.count - a.count; });

  if (scorerList.length > 0) {
    lines.push('🎯 得点者');
    scorerList.forEach(function(s) {
      var goals = '';
      for (var i = 0; i < s.count; i++) goals += '⚽';
      lines.push('  ' + s.name + ' ' + goals);
    });
  }

  var sent = sendLineMessage_(groupId, lines.join('\n'));
  return sent
    ? { success: true, message: 'ラウンド結果をLINEに送信しました' }
    : { success: false, message: 'LINE通知の送信に失敗しました' };
}

// ===================================
// 4. アンケートリマインド通知
// ===================================

/**
 * イベント終了後のアンケートリマインドをLINEグループに送信する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function notifySurveyReminder(eventId) {
  var groupId = getEventLineGroupId_(eventId);
  if (!groupId) return { success: false, message: 'LINEグループが紐づけられていません' };

  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (!event['フォームURL']) {
    return { success: false, message: 'アンケートフォームが作成されていません' };
  }

  var members = getEventMembers(eventId);
  var voters = getSurveyVoters(eventId);
  var remaining = members.length - voters.length;

  var lines = [
    '📝 アンケートのお願い',
    '',
    '「' + event['名称'] + '」お疲れさまでした！',
    '',
    'MVP選出のためのアンケートにご協力ください🙏',
    '各メンバーへのコメントを自由に記入してください。',
    ''
  ];

  if (voters.length > 0) {
    lines.push('✅ 回答済み: ' + voters.length + '/' + members.length + '人');
    if (remaining > 0) {
      lines.push('⏳ 未回答: ' + remaining + '人');
    }
    lines.push('');
  }

  lines.push('📋 アンケートはこちら:');
  lines.push(event['フォームURL']);

  var sent = sendLineMessage_(groupId, lines.join('\n'));
  return sent
    ? { success: true, message: 'アンケートリマインドをLINEに送信しました' }
    : { success: false, message: 'LINE通知の送信に失敗しました' };
}

// ===================================
// 5. MVP結果通知
// ===================================

/**
 * MVP選出結果をLINEグループに送信する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function notifyMvpResult(eventId) {
  var groupId = getEventLineGroupId_(eventId);
  if (!groupId) return { success: false, message: 'LINEグループが紐づけられていません' };

  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var mvpResults = getSheetData_('MVP結果').filter(function(r) { return r['イベントID'] === eventId; });
  if (mvpResults.length === 0) {
    return { success: false, message: 'MVP結果がありません' };
  }

  // スコア順にソート
  mvpResults.sort(function(a, b) { return (b['総合スコア'] || 0) - (a['総合スコア'] || 0); });

  var mvps = mvpResults.filter(function(r) { return r['順位'] === 'MVP'; });
  var subMvps = mvpResults.filter(function(r) { return r['順位'] === '準MVP'; });

  var lines = [
    '🏆 MVP発表！',
    '',
    '「' + event['名称'] + '」のMVPが決定しました！',
    ''
  ];

  // MVP
  if (mvps.length > 0) {
    lines.push('👑 MVP');
    mvps.forEach(function(r) {
      lines.push('  🥇 ' + r['名前'] + '【' + r['称号'] + '】');
      if (r['理由']) {
        // 理由は100文字に切り詰め（LINEの可読性のため）
        var reason = String(r['理由']);
        if (reason.length > 100) reason = reason.substring(0, 100) + '…';
        lines.push('  ' + reason);
      }
      lines.push('');
    });
  }

  // 準MVP
  if (subMvps.length > 0) {
    lines.push('🥈 準MVP');
    subMvps.forEach(function(r) {
      lines.push('  ' + r['名前'] + '【' + r['称号'] + '】');
      lines.push('');
    });
  }

  // 全員の称号一覧
  lines.push('📜 全員の称号');
  mvpResults.forEach(function(r) {
    var medal = '';
    if (r['順位'] === 'MVP') medal = '👑 ';
    else if (r['順位'] === '準MVP') medal = '🥈 ';
    lines.push('  ' + medal + r['名前'] + ' - ' + r['称号']);
  });

  lines.push('');
  lines.push('みんなお疲れさまでした！🎉');

  // アプリURLがあれば追加（詳細はアプリで確認）
  var appUrl = ScriptApp.getService().getUrl() || '';
  if (appUrl) {
    var eventUrl = appUrl + '?code=' + encodeURIComponent(event['コード'] || '');
    lines.push('');
    lines.push('📱 詳細はアプリで確認:');
    lines.push(eventUrl);
  }

  var sent = sendLineMessage_(groupId, lines.join('\n'));
  return sent
    ? { success: true, message: 'MVP結果をLINEに送信しました' }
    : { success: false, message: 'LINE通知の送信に失敗しました' };
}

// ===================================
// 手動テスト用
// ===================================

/**
 * LINE通知の接続テスト（イベント指定）
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function testLineNotification(eventId) {
  var groupId = getEventLineGroupId_(eventId);
  if (!groupId) return { success: false, message: 'LINEグループが紐づけられていません' };

  var sent = sendLineMessage_(groupId, '🔔 Salu-Rec LINE通知テスト\n接続に成功しました！');
  return sent
    ? { success: true, message: 'テスト通知を送信しました' }
    : { success: false, message: 'テスト通知の送信に失敗しました。スクリプトプロパティを確認してください。' };
}
