// ===================================
// LINE通知（LINE Messaging API）
// イベントごとのLINEグループへ通知を送信する
// ===================================
// 必要なスクリプトプロパティ:
//   LINE_CHANNEL_ACCESS_TOKEN - メッセージ送信用トークン
//
// イベントシートの「LINEグループID」列にグループIDを保存する。
// グループ内で「@公式アカウント 連携:参加コード」と送信すると紐づけされる。
// ===================================

// ===================================
// LINE API 基盤
// ===================================

/**
 * 解説者リスト
 */
var COMMENTATORS_ = [
  { name: '林陵平', style: '元Jリーガーの視点で戦術的に分析する。落ち着いたトーンで的確に語る。選手名や特徴にかけたダジャレを必ず入れる（例：「ドクの独特なドリブル」「ライスには朝飯前」のような言葉遊び）。' },
  { name: '戸田和幸', style: '情熱的で熱い語り口。選手の闘志やメンタルに注目する。ストレートな物言い。' },
  { name: 'ベン・メイブリー', style: '海外サッカーに精通した視点。ユーモアを交えつつ独自の切り口で語る。必ず「毎度、まいど！ ベン・メイブリーです」から始める。' }
];

/** LINE Messaging API エンドポイント */
var LINE_PUSH_URL_ = 'https://api.line.me/v2/bot/message/push';

/** 区切り線 */
var SEPARATOR_ = '━━━━━━━━━━━━━━━';

/** メダル絵文字 */
var MEDALS_ = ['🥇', '🥈', '🥉'];

/**
 * 通知処理を非同期で実行する（1秒後にトリガーで実行）
 * UIをブロックせずにLINE通知を送信するための仕組み
 * @param {string} functionName - 実行する通知関数名
 * @param {Array} args - 関数に渡す引数の配列
 */
function scheduleNotification_(functionName, args) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('PENDING_NOTIFICATION', JSON.stringify({ fn: functionName, args: args }));

  ScriptApp.newTrigger('executePendingNotification_')
    .timeBased()
    .after(1000)
    .create();
}

/**
 * 保留中の通知を実行する（トリガーから呼ばれる）
 */
function executePendingNotification_() {
  var props = PropertiesService.getScriptProperties();
  var pending = props.getProperty('PENDING_NOTIFICATION');

  if (!pending) {
    // 既に処理済み or データなし → トリガー削除のみ
    cleanupNotificationTriggers_();
    return;
  }

  try {
    var data = JSON.parse(pending);
    // GASではグローバル関数を名前で呼び出す
    var fnMap = {
      'notifyEventStart': notifyEventStart,
      'notifyTeamSplit': notifyTeamSplit,
      'notifyRoundResult': notifyRoundResult,
      'notifySurveyReminder': notifySurveyReminder,
      'notifyMvpResult': notifyMvpResult
    };
    var fn = fnMap[data.fn];
    if (fn) {
      fn.apply(null, data.args);
    }
    // 成功したらプロパティを削除
    props.deleteProperty('PENDING_NOTIFICATION');
  } catch (e) {
    // 失敗時はプロパティを残す（再実行でリトライされる）
  }

  cleanupNotificationTriggers_();
}

/**
 * executePendingNotification_ のトリガーを削除する
 */
function cleanupNotificationTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'executePendingNotification_') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * ラウンド番号に基づいて解説者を選ぶ（同じラウンドでは別の解説者、連続ラウンドでも被らない）
 * @param {number} roundNumber - ラウンド番号
 * @param {number} offset - オフセット（0=チーム分け, 1=ラウンド結果）
 * @return {Object} { name, style }
 */
function pickCommentatorByRound_(roundNumber, offset) {
  // 手動で最適な順序を定義（3人の場合、連続しない全6組み合わせ）
  // [チーム分け担当index, 結果担当index]
  var pairs = [
    [0, 1], // 林 → 戸田
    [2, 0], // ベン → 林
    [1, 2], // 戸田 → ベン
    [0, 2], // 林 → ベン
    [1, 0], // 戸田 → 林
    [2, 1]  // ベン → 戸田
  ];
  var pairIndex = (roundNumber - 1) % pairs.length;
  return COMMENTATORS_[pairs[pairIndex][offset]];
}

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

  if (!token || !groupId) {
    return false;
  }

  var url = LINE_PUSH_URL_;
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

    return res.getResponseCode() === 200;
  } catch (e) {
    return false;
  }
}

// ===================================
// LINEグループ連携管理（コマンド送信方式）
// グループ内で「連携:参加コード」と送信すると自動紐づけ
// ===================================

/**
 * Webhook エンドポイント（doPost）
 * グループ内で「連携:参加コード」メッセージを受信した時にイベントと紐づける
 * @param {Object} e - POSTイベント
 * @return {ContentOutput} 200 OK
 */
function doPost(e) {
  try {
    var json = JSON.parse(e.postData.contents);
    var events = json.events || [];

    events.forEach(function(ev) {
      // 公式アカウントがグループに参加した時
      if (ev.type === 'join' && ev.source && ev.source.type === 'group') {
        handleJoinGroup_(ev.source.groupId);
      }

      // グループ内のテキストメッセージを処理
      if (ev.type === 'message' && ev.message && ev.message.type === 'text'
          && ev.source && ev.source.type === 'group') {
        handleGroupMessage_(ev);
      }
    });
  } catch (err) {
    // エラーは握りつぶす（LINE に 200 を返す必要がある）
  }

  return ContentService.createTextOutput('OK');
}

/**
 * グループ参加時の挨拶メッセージを送信する
 * @param {string} groupId - グループID
 */
function handleJoinGroup_(groupId) {
  var lines = [
    'こんにちは！Salu-Rec です⚽',
    '',
    'イベントと連携するには、',
    'チャットで以下のように送信してください：',
    '',
    '@Salu-Rec 連携:参加コード',
    '',
    '参加コードはイベント作成時に発行されたものです。'
  ];

  sendLineMessage_(groupId, lines.join('\n'));
}

/**
 * グループ内メッセージを処理する
 * 公式アカウントにメンションした上で「連携:参加コード」形式のメッセージでイベントとグループを紐づける
 * 例: 「@Salu-Rec 連携:ABCD」
 * @param {Object} ev - LINEイベントオブジェクト
 */
function handleGroupMessage_(ev) {
  var text = (ev.message.text || '').trim();
  var groupId = ev.source.groupId;

  // メンションがあるか確認（公式アカウント宛のメンションが含まれているか）
  var mention = ev.message.mention;
  if (!mention || !mention.mentionees || mention.mentionees.length === 0) {
    return; // メンションなしは無視
  }

  // メンション部分を除去してコマンドを抽出
  var commandText = text;
  var mentionees = mention.mentionees.slice().sort(function(a, b) { return b.index - a.index; });
  mentionees.forEach(function(m) {
    commandText = commandText.substring(0, m.index) + commandText.substring(m.index + m.length);
  });
  commandText = commandText.trim();

  // 「連携:XXXX」または「連携：XXXX」形式を検出
  var match = commandText.match(/^連携[:：]\s*(.+)$/);
  if (!match) return;

  var code = match[1].trim().toUpperCase();

  // 参加コードからイベントを検索
  var eventData = getSheetData_('イベント');
  var event = eventData.find(function(e) {
    return String(e['コード']).toUpperCase() === code;
  });

  if (!event) {
    sendLineMessage_(groupId, '❌ 参加コード「' + code + '」に該当するイベントが見つかりません。');
    return;
  }

  var eventId = event['イベントID'];

  // 既に別のグループが紐づいている場合
  if (event['LINEグループID'] && event['LINEグループID'] !== groupId) {
    sendLineMessage_(groupId, '⚠️ 「' + event['名称'] + '」は既に別のLINEグループと連携済みです。');
    return;
  }

  // 既に同じグループが紐づいている場合
  if (event['LINEグループID'] === groupId) {
    sendLineMessage_(groupId, 'ℹ️ このグループは既に「' + event['名称'] + '」と連携済みです。');
    return;
  }

  // 紐づけ実行
  updateEventField_(eventId, 10, groupId);

  var appUrl = ScriptApp.getService().getUrl() || '';
  var eventUrl = appUrl ? appUrl + '?code=' + encodeURIComponent(code) : '';

  var replyLines = [
    '✅ 連携完了！',
    '',
    '⚽ ' + event['名称'],
    '📅 ' + event['日付'],
    '',
    'このグループにイベントの通知が届きます。'
  ];

  if (eventUrl) {
    replyLines.push('');
    replyLines.push('🔗 ' + eventUrl);
  }

  sendLineMessage_(groupId, replyLines.join('\n'));
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
    SEPARATOR_,
    '⚽ THE MATCH DAY ⚽',
    SEPARATOR_,
    '',
    '🏟️ ' + event['名称'],
    '',
    '選ばれし' + members.length + '名の戦士たちが',
    'ピッチに集結した。',
    ''
  ];

  if (memberNames.length > 0) {
    lines.push('📋 SQUAD LIST');
    lines.push(memberNames.join(' / '));
    lines.push('');
  }

  lines.push('栄光を掴むのは誰だ。');
  lines.push('間もなくキックオフ⏱️');

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
    SEPARATOR_,
    '📋 GROUP STAGE - ROUND ' + roundNumber,
    SEPARATOR_,
    ''
  ];

  for (var i = 0; i < teams.length; i++) {
    var teamName = (teamNames && teamNames[i]) ? teamNames[i] : 'チーム' + (i + 1);
    var teamMembers = teams[i].map(function(id) {
      var m = memberMap[id];
      if (!m) return '不明';
      return m['名前'];
    });

    lines.push('🏴 ' + teamName + '（' + teamMembers.length + '名）');
    lines.push('  ' + teamMembers.join(' / '));
    lines.push('');
  }

  // 解説者コメントを生成してチーム分けの直後に追加
  var commentary = generateTeamSplitCommentary_(members, memberMap, teams, teamNames, roundNumber);
  if (commentary) {
    lines.push('');
    lines.push(commentary);
  }

  lines.push('');
  lines.push('運命の組み合わせが決まった。');
  lines.push('栄光を掴むのは誰だ⚔️');

  var appUrl = ScriptApp.getService().getUrl() || '';
  if (appUrl) {
    var event = findEvent_(eventId);
    var eventUrl = appUrl + '?code=' + encodeURIComponent((event && event['コード']) || '');
    lines.push('');
    lines.push('🔗 ' + eventUrl);
  }

  var sent = sendLineMessage_(groupId, lines.join('\n'));
  return sent
    ? { success: true, message: 'チーム分け結果をLINEに送信しました' }
    : { success: false, message: 'LINE通知の送信に失敗しました' };
}

/**
 * イベントの得点・勝ち点ランキングを計算する
 * @param {string} eventId - イベントID
 * @return {Object} { goalRanking: [{id, name, count}], pointRanking: [{id, name, points}] }
 */
function calcEventStats_(eventId) {
  var data = getMultipleSheetData_(['ラウンド', 'マッチ', 'マッチメンバー', '得点', 'メンバー']);
  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });
  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });
  var matches = data['マッチ'].filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0 && m['ステータス'] === '終了'; });
  var matchIds = matches.map(function(m) { return m['マッチID']; });

  // マッチごとのスコア
  var matchScores = {};
  data['得点'].forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) < 0) return;
    if (!matchScores[g['マッチID']]) matchScores[g['マッチID']] = { A: 0, B: 0 };
    if (g['チーム'] === 'A') matchScores[g['マッチID']].A++;
    if (g['チーム'] === 'B') matchScores[g['マッチID']].B++;
  });

  // 得点ランキング
  var goalCounts = {};
  data['得点'].forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) < 0) return;
    if (g['種別'] === '通常' && g['メンバーID']) {
      goalCounts[g['メンバーID']] = (goalCounts[g['メンバーID']] || 0) + 1;
    }
  });

  // 勝ち点ランキング
  var pointCounts = {};
  data['マッチメンバー'].forEach(function(mm) {
    if (matchIds.indexOf(mm['マッチID']) < 0) return;
    var memberId = mm['メンバーID'];
    if (!pointCounts[memberId]) pointCounts[memberId] = 0;

    var sc = matchScores[mm['マッチID']] || { A: 0, B: 0 };
    var myScore = mm['チーム'] === 'A' ? sc.A : sc.B;
    var oppScore = mm['チーム'] === 'A' ? sc.B : sc.A;

    if (myScore > oppScore) pointCounts[memberId] += 3;
    else if (myScore === oppScore) pointCounts[memberId] += 1;
  });

  var goalRanking = Object.keys(goalCounts).map(function(id) {
    return { id: id, name: (memberMap[id] || {})['名前'] || '不明', count: goalCounts[id] };
  }).sort(function(a, b) { return b.count - a.count; });

  var pointRanking = Object.keys(pointCounts).map(function(id) {
    return { id: id, name: (memberMap[id] || {})['名前'] || '不明', points: pointCounts[id] };
  }).sort(function(a, b) { return b.points - a.points; });

  return { goalRanking: goalRanking, pointRanking: pointRanking };
}

/**
 * チーム分け時の解説者コメントをGemini AIで生成する
 * ランダムに選手をピックアップし、ラウンドに応じた解説者がコメントする
 * @param {Object[]} members - メンバー配列
 * @param {Object} memberMap - メンバーIDマップ
 * @param {string[][]} teams - チームごとのメンバーID配列
 * @param {string[]} teamNames - チーム名配列
 * @param {number} roundNumber - ラウンド番号
 * @return {string|null} 解説コメント文字列、失敗時はnull
 */
function generateTeamSplitCommentary_(members, memberMap, teams, teamNames, roundNumber) {
  var commentator = pickCommentatorByRound_(roundNumber, 0);

  // ラウンド2以降は過去の成績を取得
  var goalRanking = [];
  var pointRanking = [];
  if (roundNumber > 1) {
    var eventId = members[0] ? members[0]['イベントID'] : '';
    if (eventId) {
      var stats = calcEventStats_(eventId);
      goalRanking = stats.goalRanking;
      pointRanking = stats.pointRanking;
    }
  }

  // ラウンド番号に基づいて選手を決定的に選ぶ（重複しない、幹事は除外）
  var allMemberIds = [];
  teams.forEach(function(team) { allMemberIds = allMemberIds.concat(team); });
  // 幹事を除外
  allMemberIds = allMemberIds.filter(function(id) {
    var m = memberMap[id] || {};
    return m['幹事'] !== 'はい';
  });
  if (allMemberIds.length === 0) return null;
  // メンバーIDでソートして順序を固定
  allMemberIds.sort();
  var pickIndex = (roundNumber - 1) % allMemberIds.length;
  var pickedMembers = [allMemberIds[pickIndex]].map(function(id) {
    var m = memberMap[id] || {};
    var teamIndex = -1;
    for (var t = 0; t < teams.length; t++) {
      if (teams[t].indexOf(id) >= 0) { teamIndex = t; break; }
    }
    var tName = (teamNames && teamNames[teamIndex]) ? teamNames[teamIndex] : 'チーム' + (teamIndex + 1);

    // ランキング順位を取得
    var goalRank = '';
    var pointRank = '';
    if (roundNumber > 1) {
      for (var gi = 0; gi < goalRanking.length; gi++) {
        if (goalRanking[gi].id === id) { goalRank = (gi + 1) + '位(' + goalRanking[gi].count + 'G)'; break; }
      }
      for (var pi = 0; pi < pointRanking.length; pi++) {
        if (pointRanking[pi].id === id) { pointRank = (pi + 1) + '位(' + pointRanking[pi].points + 'pts)'; break; }
      }
    }

    return {
      name: m['名前'] || '不明',
      team: tName,
      experience: m['サッカー経験'] || 'なし',
      years: m['年次'] || '不明',
      note: m['備考'] || '',
      spirit: m['意気込み'] || '',
      goalRank: goalRank,
      pointRank: pointRank
    };
  });

  var memberInfo = pickedMembers.map(function(p) {
    var info = '- ' + p.name + '（' + p.team + '）: 経験=' + p.experience + ', 年次=' + p.years;
    if (p.note) info += ', 備考=' + p.note;
    if (p.spirit) info += ', 意気込み=' + p.spirit;
    if (p.goalRank) info += ', 得点ランキング=' + p.goalRank;
    if (p.pointRank) info += ', 勝ち点ランキング=' + p.pointRank;
    return info;
  }).join('\n');

  var prompt = '# 役割\n' +
    'あなたはサッカー解説者「' + commentator.name + '」です。\n' +
    'スタイル: ' + commentator.style + '\n\n' +
    '# 指示\n' +
    '社内フットサルのチーム分けが発表されました。以下のピックアップ選手について、試合前の解説コメントを書いてください。\n\n' +
    '## ルール\n' +
    '- 「' + commentator.name + '」の口調・キャラクターで書く\n' +
    '- 2〜3文で簡潔に（80文字以内）\n' +
    '- 社内フットサルなのでプロ扱いしすぎない。でも真剣に語る\n' +
    '- 入力データにない情報を捏造しない\n' +
    '- 経験「なし」の選手には成長や意外性に期待するコメント\n' +
    '- 経験「あり」の選手にはキーマンとしての期待\n' +
    '- ランキング情報があればそれに触れてもOK\n' +
    '- 備考があればネタにしてOK\n' +
    '- 出力は解説コメントのテキストのみ（JSON不要、名前の署名不要）\n\n' +
    '## ピックアップ選手\n' + memberInfo;

  var response = callGeminiText_(prompt);
  if (!response) return null;

  // 解説者名を付けて返す
  return '🎙️ ' + commentator.name + '\n「' + response.trim().replace(/^「|」$/g, '') + '」';
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
    SEPARATOR_,
    '🏁 FULL TIME - ROUND ' + round['ラウンド番号'],
    SEPARATOR_,
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

    lines.push('⚽ MATCH ' + match['マッチ番号']);
    lines.push('  ' + match['チームA名'] + '  ' + scoreA + ' - ' + scoreB + '  ' + match['チームB名']);
    if (scoreA > scoreB) {
      lines.push('  👑 ' + match['チームA名'] + ' WIN');
    } else if (scoreB > scoreA) {
      lines.push('  👑 ' + match['チームB名'] + ' WIN');
    } else {
      lines.push('  🤝 DRAW');
    }
    lines.push('');
  });

  // 得点ランキング
  var scorerList = Object.keys(allScorers).map(function(name) {
    return { name: name, count: allScorers[name] };
  }).sort(function(a, b) { return b.count - a.count; });

  if (scorerList.length > 0) {
    lines.push('🎯 SCORERS');
    scorerList.forEach(function(s) {
      var goals = '';
      for (var i = 0; i < s.count; i++) goals += '⚽';
      lines.push('  ' + s.name + ' ' + goals);
    });
    lines.push('');
  }

  // 解説者コメント（SCORERSの直後）
  var commentary = generateRoundResultCommentary_(matches, allScorers, data, memberMap, eventId, round['ラウンド番号']);
  if (commentary) {
    lines.push(commentary);
    lines.push('');
  }

  lines.push('激闘の幕が下りた。次の戦いへ続く。');

  var appUrl = ScriptApp.getService().getUrl() || '';
  if (appUrl) {
    var event = data['イベント'].find(function(e) { return e['イベントID'] === eventId; });
    var eventUrl = appUrl + '?code=' + encodeURIComponent((event && event['コード']) || '');
    lines.push('');
    lines.push('🔗 ' + eventUrl);
  }

  var sent = sendLineMessage_(groupId, lines.join('\n'));
  return sent
    ? { success: true, message: 'ラウンド結果をLINEに送信しました' }
    : { success: false, message: 'LINE通知の送信に失敗しました' };
}

/**
 * ラウンド結果に対する解説者コメントをGemini AIで生成する
 * @param {Object[]} matches - マッチデータ
 * @param {Object} allScorers - 得点者マップ { 名前: 得点数 }
 * @param {Object} data - getMultipleSheetData_の結果
 * @param {Object} memberMap - メンバーIDマップ
 * @param {string} eventId - イベントID
 * @param {number} roundNumber - ラウンド番号
 * @return {string|null} 解説コメント文字列、失敗時はnull
 */
function generateRoundResultCommentary_(matches, allScorers, data, memberMap, eventId, roundNumber) {
  var commentator = pickCommentatorByRound_(roundNumber, 1);

  // 試合結果サマリを作成
  var matchSummary = matches.map(function(match) {
    var matchGoals = data['得点'].filter(function(g) { return g['マッチID'] === match['マッチID']; });
    var scoreA = matchGoals.filter(function(g) { return g['チーム'] === 'A'; }).length;
    var scoreB = matchGoals.filter(function(g) { return g['チーム'] === 'B'; }).length;
    return match['チームA名'] + ' ' + scoreA + '-' + scoreB + ' ' + match['チームB名'];
  }).join('\n');

  var scorerSummary = Object.keys(allScorers).map(function(name) {
    return name + ': ' + allScorers[name] + '点';
  }).join(', ');

  // イベント全体のランキング（このラウンド終了時点）
  var overallStats = calcEventStats_(eventId);
  var overallGoalTop3 = overallStats.goalRanking.slice(0, 3).map(function(r, i) {
    return (i + 1) + '位 ' + r.name + '(' + r.count + 'G)';
  }).join(', ');
  var overallPointTop3 = overallStats.pointRanking.slice(0, 3).map(function(r, i) {
    return (i + 1) + '位 ' + r.name + '(' + r.points + 'pts)';
  }).join(', ');

  var prompt = '# 役割\n' +
    'あなたはサッカー解説者「' + commentator.name + '」です。\n' +
    'スタイル: ' + commentator.style + '\n\n' +
    '# 指示\n' +
    '社内フットサルのラウンドが終了しました。試合結果とイベント全体の順位変動を見て、一言感想を述べてください。\n\n' +
    '## ルール\n' +
    '- 「' + commentator.name + '」の口調・キャラクターで書く\n' +
    '- 1〜2文で簡潔に（60文字以内）\n' +
    '- 社内フットサルなのでプロ扱いしすぎない。でも真剣に語る\n' +
    '- 結果に基づいた感想（捏造しない）\n' +
    '- 得点者がいればその選手に触れてもOK\n' +
    '- 全体ランキングと今ラウンドの得点者を見比べて、順位変動を推測して触れてもOK（例：「この2得点で得点王に躍り出た」）\n' +
    '- 出力は解説コメントのテキストのみ（JSON不要、名前の署名不要）\n\n' +
    '## 今ラウンドの試合結果\n' + matchSummary + '\n\n' +
    '## 今ラウンドの得点者\n' + (scorerSummary || 'なし') + '\n\n' +
    '## イベント全体 得点ランキングTOP3\n' + (overallGoalTop3 || 'なし') + '\n\n' +
    '## イベント全体 勝ち点ランキングTOP3\n' + (overallPointTop3 || 'なし');

  var response = callGeminiText_(prompt);
  if (!response) return null;

  return '🎙️ ' + commentator.name + '\n「' + response.trim().replace(/^「|」$/g, '') + '」';
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

  var lines = [
    SEPARATOR_,
    '🏅 MAN OF THE MATCH',
    SEPARATOR_,
    '',
    '全試合が終了した。',
    '',
    '今宵の最優秀選手は誰か──',
    'その評価を託すのは、ピッチに立った君たちだ。',
    '',
    '📋 VOTE',
    event['フォームURL']
  ];

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

  // 得点・勝ち点ランキング用データ取得
  var data = getMultipleSheetData_(['ラウンド', 'マッチ', 'マッチメンバー', '得点', 'メンバー']);
  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });
  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });
  var matches = data['マッチ'].filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0; });
  var matchIds = matches.map(function(m) { return m['マッチID']; });

  // マッチごとのスコア事前計算
  var matchScores = {};
  data['得点'].forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) < 0) return;
    if (!matchScores[g['マッチID']]) matchScores[g['マッチID']] = { A: 0, B: 0 };
    if (g['チーム'] === 'A') matchScores[g['マッチID']].A++;
    if (g['チーム'] === 'B') matchScores[g['マッチID']].B++;
  });

  // 得点ランキング集計
  var goalCounts = {};
  data['得点'].forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) < 0) return;
    if (g['種別'] === '通常' && g['メンバーID']) {
      goalCounts[g['メンバーID']] = (goalCounts[g['メンバーID']] || 0) + 1;
    }
  });

  // 勝ち点ランキング集計（勝ち=3, 引き分け=1, 負け=0）
  var pointCounts = {};
  data['マッチメンバー'].forEach(function(mm) {
    if (matchIds.indexOf(mm['マッチID']) < 0) return;
    var memberId = mm['メンバーID'];
    if (!pointCounts[memberId]) pointCounts[memberId] = 0;

    var match = matches.find(function(m) { return m['マッチID'] === mm['マッチID']; });
    if (!match || match['ステータス'] !== '終了') return;

    var sc = matchScores[mm['マッチID']] || { A: 0, B: 0 };
    var myTeam = mm['チーム'];
    var myScore = myTeam === 'A' ? sc.A : sc.B;
    var oppScore = myTeam === 'A' ? sc.B : sc.A;

    if (myScore > oppScore) pointCounts[memberId] += 3;
    else if (myScore === oppScore) pointCounts[memberId] += 1;
  });

  // スコア順にソート
  mvpResults.sort(function(a, b) { return (b['総合スコア'] || 0) - (a['総合スコア'] || 0); });

  var mvps = mvpResults.filter(function(r) { return r['順位'] === 'MVP'; });
  var subMvps = mvpResults.filter(function(r) { return r['順位'] === '準MVP'; });

  var lines = [
    SEPARATOR_,
    '👑 BEST PLAYER AWARD',
    SEPARATOR_,
    '',
    'Congratulations.',
    '私 Gianni Infantino は、FIFA会長の名において',
    '本日の最優秀選手を発表する。',
    '',
    '厳正なる審査の結果──',
    '以下の選手に栄誉を授ける。',
    ''
  ];

  // MVP
  if (mvps.length > 0) {
    lines.push('🏆 MVP');
    mvps.forEach(function(r) {
      lines.push('');
      lines.push('  ' + r['名前']);
      lines.push('  「' + r['称号'] + '」');
    });
    lines.push('');
  }

  // 準MVP
  if (subMvps.length > 0) {
    lines.push('🥈 準MVP');
    subMvps.forEach(function(r) {
      lines.push('  ' + r['名前'] + ' ─ ' + r['称号']);
    });
    lines.push('');
  }

  // 得点ランキング TOP3
  var goalRanking = Object.keys(goalCounts).map(function(id) {
    return { name: (memberMap[id] || {})['名前'] || '不明', count: goalCounts[id] };
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, 3);

  if (goalRanking.length > 0) {
    lines.push(SEPARATOR_);
    lines.push('⚽ TOP SCORERS');
    lines.push(SEPARATOR_);
    goalRanking.forEach(function(r, i) {
      lines.push(MEDALS_[i] + ' ' + r.name + '  ' + r.count + 'G');
    });
    lines.push('');
  }

  // 勝ち点ランキング TOP3
  var pointRanking = Object.keys(pointCounts).map(function(id) {
    return { name: (memberMap[id] || {})['名前'] || '不明', points: pointCounts[id] };
  }).sort(function(a, b) { return b.points - a.points; }).slice(0, 3);

  if (pointRanking.length > 0) {
    lines.push(SEPARATOR_);
    lines.push('📊 WIN POINTS');
    lines.push(SEPARATOR_);
    pointRanking.forEach(function(r, i) {
      lines.push(MEDALS_[i] + ' ' + r.name + '  ' + r.points + 'pts');
    });
    lines.push('');
  }

  // アプリURLがあれば追加
  var appUrl = ScriptApp.getService().getUrl() || '';
  if (appUrl) {
    var eventUrl = appUrl + '?code=' + encodeURIComponent(event['コード'] || '');
    lines.push('📱 詳細はこちら');
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
