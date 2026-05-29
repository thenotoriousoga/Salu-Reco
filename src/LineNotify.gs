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
  { name: 'ベン・メイブリー', style: '海外サッカーに精通した視点。ユーモアを交えつつ独自の切り口で語る。必ず「毎度、まいど！ ベン・メイブリーです」から始める。' },
  { name: '粕谷秀樹', style: '辛口で歯に衣着せない物言い。プレミアリーグ的な視点で冷静にバッサリ切る。褒めるときも一言多い。' },
  { name: '倉敷保雄', style: '詩的で格調高い実況スタイル。情景描写が美しく、名フレーズを生み出す。文学的な表現を好む。' },
  { name: '下田恒幸', style: 'テンポの良い実況で臨場感を伝える。選手の名前を叫ぶのが特徴。ゴールシーンでは感情が溢れる。「さぁ」から始めがち。' },
  { name: '北川義隆', style: 'セリエA実況でおなじみのイタリア大好きおじさん。イタリア語を自然に混ぜて語る（例：「Bravo!」「Fantastico!」「Che bello!」）。感情が高ぶると私情が漏れる。' }
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
 * 複数の通知をキューに積んで順番に実行する
 * @param {string} functionName - 実行する通知関数名
 * @param {Array} args - 関数に渡す引数の配列
 */
function scheduleNotification_(functionName, args) {
  var props = PropertiesService.getScriptProperties();
  var queue = props.getProperty('NOTIFICATION_QUEUE');
  var items = queue ? JSON.parse(queue) : [];
  items.push({ fn: functionName, args: args });
  props.setProperty('NOTIFICATION_QUEUE', JSON.stringify(items));

  // トリガーが既にあれば追加しない（1つで全キューを処理する）
  var triggers = ScriptApp.getProjectTriggers();
  var hasExisting = triggers.some(function(t) {
    return t.getHandlerFunction() === 'executePendingNotification_';
  });

  if (!hasExisting) {
    ScriptApp.newTrigger('executePendingNotification_')
      .timeBased()
      .after(1000)
      .create();
  }
}

/**
 * キューに積まれた通知を順番に実行する（トリガーから呼ばれる）
 */
function executePendingNotification_() {
  var props = PropertiesService.getScriptProperties();
  var queue = props.getProperty('NOTIFICATION_QUEUE');

  if (!queue) {
    cleanupNotificationTriggers_();
    return;
  }

  var items = JSON.parse(queue);
  if (items.length === 0) {
    props.deleteProperty('NOTIFICATION_QUEUE');
    cleanupNotificationTriggers_();
    return;
  }

  var fnMap = {
    'notifyEventStart': notifyEventStart,
    'notifyTeamSplit': notifyTeamSplit,
    'notifyRoundResult': notifyRoundResult,
    'notifySurveyReminder': notifySurveyReminder,
    'notifyMvpResult': notifyMvpResult
  };

  try {
    // キューを順番に実行
    for (var i = 0; i < items.length; i++) {
      var data = items[i];
      var fn = fnMap[data.fn];
      if (fn) {
        fn.apply(null, data.args);
      }
    }
    // 全て成功したらキューを削除
    props.deleteProperty('NOTIFICATION_QUEUE');
  } catch (e) {
    // 失敗時はキューを残す（再実行でリトライされる）
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
  // 7人の解説者から、チーム分けと結果で被らないペアを選ぶ
  // [チーム分け担当index, 結果担当index]
  var pairs = [
    [0, 3], // 林 → 粕谷
    [1, 4], // 戸田 → 倉敷
    [2, 5], // ベン → 下田
    [3, 6], // 粕谷 → 北川
    [4, 0], // 倉敷 → 林
    [5, 1], // 下田 → 戸田
    [6, 2], // 北川 → ベン
    [0, 5], // 林 → 下田
    [1, 6], // 戸田 → 北川
    [2, 3], // ベン → 粕谷
    [3, 4], // 粕谷 → 倉敷
    [4, 2], // 倉敷 → ベン
    [5, 0], // 下田 → 林
    [6, 1]  // 北川 → 戸田
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
    '✦━━━━━━━━━━━━━━━✦',
    '  ⭐ Salu-Rec HAS ARRIVED ⭐',
    '✦━━━━━━━━━━━━━━━✦',
    '',
    'お招きいただき光栄です。',
    'この舞台を、特別な一日に変えてみせます。',
    '',
    'イベントとの連携を完了するには',
    '以下を送信してください。',
    '',
    '━━━━━━━━━━━━━━━',
    '📝 HOW TO CONNECT',
    '━━━━━━━━━━━━━━━',
    '@Salu-Rec 連携:参加コード',
    '',
    '※参加コードはイベント作成時に',
    '  発行されたものです。',
    '',
    'LET THE GAME BEGIN. ⚽'
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
    '✦━━━━━━━━━━━━━━━✦',
    '  ⚽ CONNECTED ⚽',
    '✦━━━━━━━━━━━━━━━✦',
    '',
    '連携が完了いたしました。',
    'このグループは正式に登録されております。',
    '',
    '🏟️ ' + event['名称'],
    '📅 ' + event['日付'],
    '',
    'イベントの通知はすべてこちらに届きます。',
    '',
    '🔥 意気込みのご登録もお忘れなく。',
    '',
    'THE COUNTDOWN BEGINS. ⏱️'
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
    '✦━━━━━━━━━━━━━━━✦',
    '  ⭐ MATCH DAY ⭐',
    '✦━━━━━━━━━━━━━━━✦',
    '',
    '🏟️ ' + event['名称'],
    '',
    '選ばれし' + members.length + '名の戦士たちが',
    'ピッチに集結する。',
    ''
  ];

  if (memberNames.length > 0) {
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('📋 SQUAD LIST');
    lines.push('━━━━━━━━━━━━━━━');
    lines.push(memberNames.join(' / '));
    lines.push('');
  }

  lines.push('歴史を刻むのは、誰だ──');
  lines.push('');
  lines.push('THE FUTSAL IS HERE. ⚽');

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
 * @param {string[]} [captains] - 各チームのキャプテンID配列
 * @return {Object} 結果オブジェクト { success, message }
 */
function notifyTeamSplit(eventId, teamNames, teams, roundNumber, captains) {
  var groupId = getEventLineGroupId_(eventId);
  if (!groupId) return { success: false, message: 'LINEグループが紐づけられていません' };

  var members = getEventMembers(eventId);
  var memberMap = buildMap_(members, 'メンバーID');

  var lines = [
    '✦━━━━━━━━━━━━━━━✦',
    '  ⚔️ ROUND ' + roundNumber + ' LINE-UP ⚔️',
    '✦━━━━━━━━━━━━━━━✦',
    '',
    '布陣が発表された──',
    ''
  ];

  // UIのチームカラー（team-a〜e）に対応した絵文字
  // a=青, b=ピンク, c=緑, d=オレンジ, e=紫
  var teamEmblems = ['🔵', '🔴', '🟢', '🟠', '🟣'];

  for (var i = 0; i < teams.length; i++) {
    var teamName = (teamNames && teamNames[i]) ? teamNames[i] : 'チーム' + (i + 1);
    var emblem = teamEmblems[i % teamEmblems.length];
    var captainId = (captains && captains[i]) ? captains[i] : null;
    // キャプテンを先頭に並べ替え
    var sortedIds = teams[i].slice();
    if (captainId) {
      sortedIds.sort(function(a, b) {
        if (a === captainId) return -1;
        if (b === captainId) return 1;
        return 0;
      });
    }
    var teamMembers = sortedIds.map(function(id) {
      var m = memberMap[id];
      if (!m) return '不明';
      var name = m['名前'];
      if (id === captainId) return 'Ⓒ' + name;
      return name;
    });

    lines.push('━━━━━━━━━━━━━━━');
    lines.push(emblem + ' ' + teamName + '（' + teamMembers.length + '名）');
    lines.push('━━━━━━━━━━━━━━━');
    lines.push(teamMembers.join(' / '));
    lines.push('');
  }

  // 解説者コメントを生成してチーム分けの直後に追加
  var commentary = generateTeamSplitCommentary_(members, memberMap, teams, teamNames, roundNumber);
  if (commentary) {
    lines.push('');
    lines.push(commentary);
  }

  lines.push('');
  lines.push('組み合わせは決まった。');
  lines.push('あとはピッチで証明するだけだ。');

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

  // マッチごとのスコア（共通ヘルパーを使用）
  var matchScores = buildMatchScores_(data['得点'], matchIds);

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
    var info = '- ' + p.name + '（' + p.team + '）';
    // 個性的な情報を先に出す（AIの注目を誘導）
    if (p.goalRank) info += ' 得点ランキング=' + p.goalRank;
    if (p.pointRank) info += ' 勝ち点ランキング=' + p.pointRank;
    if (p.spirit) info += ' 意気込み:「' + p.spirit + '」';
    if (p.note) info += ' 備考: ' + p.note;
    // 年次・経験は補足（参考程度）
    info += ' （社会人' + p.years + '年目, サッカー経験' + p.experience + '）';
    return info;
  }).join('\n');

  var prompt = 'あなたはサッカー解説者「' + commentator.name + '」。\n' +
    'スタイル: ' + commentator.style + '\n\n' +
    '社内フットサルのチーム分けが発表された。以下の注目選手について解説コメントを一言（80文字以内）。\n' +
    '選手を三人称で語ること（「彼は〜」「○○選手は〜」など）。選手本人に話しかける二人称（「君は」「お前は」）は禁止。\n' +
    '入力データにない情報は書かない。ランキング情報や意気込み・備考があればそちらを優先的にネタにする。\n' +
    '注意: 「年次」「経験の有無」だけに言及するコメントは避ける。それらは補足情報であり、コメントの主題にしないこと。\n\n' +
    memberInfo;

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
    '✦━━━━━━━━━━━━━━━✦',
    '  🏁 FULL TIME - ROUND ' + round['ラウンド番号'] + ' 🏁',
    '✦━━━━━━━━━━━━━━━✦',
    ''
  ];

  // ラウンド内の勝ち点・得点を集計
  var matchIds = matches.map(function(m) { return m['マッチID']; });
  var roundMatchScores = buildMatchScores_(data['得点'], matchIds);

  // チームごとの勝ち点を集計（チーム名ベース）
  var teamStats = {}; // { teamName: { points, goalsFor, goalsAgainst } }

  matches.forEach(function(match) {
    var mId = match['マッチID'];
    var sc = roundMatchScores[mId] || { A: 0, B: 0 };
    var teamAName = match['チームA名'] || 'チームA';
    var teamBName = match['チームB名'] || 'チームB';

    if (!teamStats[teamAName]) teamStats[teamAName] = { points: 0, goalsFor: 0, goalsAgainst: 0, played: 0 };
    if (!teamStats[teamBName]) teamStats[teamBName] = { points: 0, goalsFor: 0, goalsAgainst: 0, played: 0 };

    teamStats[teamAName].played++;
    teamStats[teamBName].played++;
    teamStats[teamAName].goalsFor += sc.A;
    teamStats[teamAName].goalsAgainst += sc.B;
    teamStats[teamBName].goalsFor += sc.B;
    teamStats[teamBName].goalsAgainst += sc.A;

    if (sc.A > sc.B) {
      teamStats[teamAName].points += 3;
      teamStats[teamAName].wins = (teamStats[teamAName].wins || 0) + 1;
      teamStats[teamBName].losses = (teamStats[teamBName].losses || 0) + 1;
    } else if (sc.B > sc.A) {
      teamStats[teamBName].points += 3;
      teamStats[teamBName].wins = (teamStats[teamBName].wins || 0) + 1;
      teamStats[teamAName].losses = (teamStats[teamAName].losses || 0) + 1;
    } else {
      teamStats[teamAName].points += 1;
      teamStats[teamBName].points += 1;
      teamStats[teamAName].draws = (teamStats[teamAName].draws || 0) + 1;
      teamStats[teamBName].draws = (teamStats[teamBName].draws || 0) + 1;
    }
  });

  // チーム順位表（勝ち点 → 得失点差 → 得点数 でソート）
  var standings = Object.keys(teamStats).map(function(name) {
    var s = teamStats[name];
    s.name = name;
    s.diff = s.goalsFor - s.goalsAgainst;
    return s;
  }).sort(function(a, b) {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.goalsFor - a.goalsFor;
  });

  // 個人得点集計
  var allScorers = {};
  data['得点'].forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) < 0) return;
    if (g['種別'] === '通常' && g['メンバーID']) {
      var name = (memberMap[g['メンバーID']] || {})['名前'] || '不明';
      allScorers[name] = (allScorers[name] || 0) + 1;
    }
  });

  lines.push('📊 STANDINGS');
  lines.push('━━━━━━━━━━━━━━━');
  var medals = ['🥇', '🥈', '🥉'];
  standings.forEach(function(s, i) {
    var prefix = i < 3 ? medals[i] : '　';
    var w = s.wins || 0;
    var d = s.draws || 0;
    var l = s.losses || 0;
    lines.push(prefix + ' ' + s.name + '  ' + s.points + 'pts (' + w + '勝' + d + '分' + l + '敗)');
  });
  lines.push('');

  // 得点ランキング TOP3
  var scorerList = Object.keys(allScorers).map(function(name) {
    return { name: name, count: allScorers[name] };
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, 3);

  if (scorerList.length > 0) {
    lines.push('🎯 TOP SCORERS');
    lines.push('━━━━━━━━━━━━━━━');
    scorerList.forEach(function(s, i) {
      var goals = '';
      for (var j = 0; j < s.count; j++) goals += '⚽';
      var prefix = i < 3 ? medals[i] : '　';
      lines.push(prefix + ' ' + s.name + ' ' + goals);
    });
    lines.push('');
  }

  // 解説者コメント
  var commentary = generateRoundResultCommentary_(matches, allScorers, data, memberMap, eventId, round['ラウンド番号']);
  if (commentary) {
    lines.push(commentary);
    lines.push('');
  }

  lines.push('激闘の幕が下りた。次のラウンドへ続く──');

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

  var prompt = 'あなたはサッカー解説者「' + commentator.name + '」。\n' +
    'スタイル: ' + commentator.style + '\n\n' +
    '社内フットサルのラウンド終了。結果を見て一言感想（60文字以内）。\n' +
    '入力データにない情報は書かない。順位変動を推測して触れてOK。\n\n' +
    '試合結果:\n' + matchSummary + '\n\n' +
    '得点者: ' + (scorerSummary || 'なし') + '\n\n' +
    '全体得点TOP3: ' + (overallGoalTop3 || 'なし') + '\n' +
    '全体勝ち点TOP3: ' + (overallPointTop3 || 'なし');

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
    '✦━━━━━━━━━━━━━━━✦',
    '  🏅 MAN OF THE MATCH 🏅',
    '✦━━━━━━━━━━━━━━━✦',
    '',
    '全試合が終了した。',
    '',
    '最優秀選手は誰か──',
    'それを決めるのは、ピッチに立った君たちだ。',
    '',
    '━━━━━━━━━━━━━━━',
    '📋 CAST YOUR VOTE',
    '━━━━━━━━━━━━━━━',
    event['フォームURL'],
    '',
    'YOUR VOTE DECIDES GLORY. 🗳️'
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

  // calcEventStats_ を再利用してランキングを取得
  var stats = calcEventStats_(eventId);

  // スコア順にソート
  mvpResults.sort(function(a, b) { return (b['レーティング'] || 0) - (a['レーティング'] || 0); });

  var mvps = mvpResults.filter(function(r) { return r['順位'] === 'MVP'; });
  var subMvps = mvpResults.filter(function(r) { return r['順位'] === '準MVP'; });

  var lines = [
    '✦━━━━━━━━━━━━━━━✦',
    '  👑 BEST PLAYER AWARD 👑',
    '✦━━━━━━━━━━━━━━━✦',
    '',
    'THE VOTES ARE IN.',
    '',
    '私、ジャンニ・インファンティーノは、',
    'FIFA会長の名において',
    '本日の最優秀選手を発表する。',
    '',
    '厳正なる投票の結果──',
    '以下の選手に栄誉を授ける。',
    ''
  ];

  // MVP
  if (mvps.length > 0) {
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('🏆 MVP');
    lines.push('━━━━━━━━━━━━━━━');
    mvps.forEach(function(r) {
      lines.push('  ⭐ ' + r['名前']);
      lines.push('  「' + r['称号'] + '」');
    });
    lines.push('');
  }

  // 準MVP
  if (subMvps.length > 0) {
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('🥈 準MVP');
    lines.push('━━━━━━━━━━━━━━━');
    subMvps.forEach(function(r) {
      lines.push('  ' + r['名前']);
      lines.push('  「' + r['称号'] + '」');
    });
    lines.push('');
  }

  // 得点ランキング TOP3
  var goalRanking = stats.goalRanking.slice(0, 3);
  if (goalRanking.length > 0) {
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('⚽ TOP SCORERS');
    lines.push('━━━━━━━━━━━━━━━');
    goalRanking.forEach(function(r, i) {
      lines.push(MEDALS_[i] + ' ' + r.name + '  ' + r.count + 'G');
    });
    lines.push('');
  }

  // 勝ち点ランキング TOP3
  var pointRanking = stats.pointRanking.slice(0, 3);
  if (pointRanking.length > 0) {
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('📊 WIN POINTS');
    lines.push('━━━━━━━━━━━━━━━');
    pointRanking.forEach(function(r, i) {
      lines.push(MEDALS_[i] + ' ' + r.name + '  ' + r.points + 'pts');
    });
    lines.push('');
  }

  lines.push('CONGRATULATIONS. 🎉');

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
