// ===================================
// ラウンド・マッチ管理
// ラウンド = チーム分けの単位（Nチーム）
// マッチ = 2チーム対戦（ラウンド内の個別試合）
// ===================================

// ===================================
// ラウンド操作
// ===================================

/**
 * ラウンドを作成する（チーム分け結果を保存）
 * @param {string} eventId - イベントID
 * @param {string[]} teamNames - チーム名の配列
 * @param {string[][]} teams - チームごとのメンバーID配列
 * @return {Object} 結果オブジェクト { success, roundId, roundNumber, message }
 */
function createRound(eventId, teamNames, teams) {
  var ss = getSpreadsheet_();
  var roundSheet = ensureSheet_(ss, 'ラウンド');
  var roundId = generateId_();

  var existing = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundNumber = existing.length + 1;
  var splitJson = JSON.stringify({ names: teamNames, teams: teams });

  roundSheet.appendRow([roundId, eventId, roundNumber, splitJson, '進行中']);
  updateEventStatus(eventId, '進行中');

  return {
    success: true,
    roundId: roundId,
    roundNumber: roundNumber,
    message: 'ラウンド' + roundNumber + '開始！ピッチがあなたを待っている'
  };
}

/**
 * イベントのラウンド一覧を取得する（マッチ情報含む）
 * @param {string} eventId - イベントID
 * @return {Object[]} ラウンドデータの配列
 */
function getRounds(eventId) {
  var data = getMultipleSheetData_(['ラウンド', 'マッチ', 'マッチメンバー', '得点', 'メンバー']);
  var memberMap = buildMap_(data['メンバー'], 'メンバーID');
  var eventRounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });

  return buildRoundsData_(eventRounds, data['マッチ'], data['マッチメンバー'], data['得点'], memberMap);
}

/**
 * ラウンド配列からクライアント用データ構造を構築する
 * getEventDetail / getRounds の共通処理
 * @param {Object[]} eventRounds - イベントに紐づくラウンドデータ
 * @param {Object[]} allMatches - 全マッチデータ
 * @param {Object[]} matchMembers - 全マッチメンバーデータ
 * @param {Object[]} goals - 全得点データ
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @return {Object[]} ラウンドデータの配列
 */
function buildRoundsData_(eventRounds, allMatches, matchMembers, goals, memberMap) {
  return eventRounds.map(function(round) {
    var rId = round['ラウンドID'];
    var splitData = null;
    try { splitData = JSON.parse(round['チーム分けJSON']); } catch (e) { /* パース失敗は無視 */ }

    var rMatches = allMatches
      .filter(function(m) { return m['ラウンドID'] === rId; })
      .sort(function(a, b) { return a['マッチ番号'] - b['マッチ番号']; });

    var matchesData = rMatches.map(function(match) {
      return buildMatchData_(match, matchMembers, goals, memberMap);
    });

    return {
      id: rId,
      roundNumber: round['ラウンド番号'],
      status: round['ステータス'],
      splitData: splitData,
      matches: matchesData
    };
  }).sort(function(a, b) { return a.roundNumber - b.roundNumber; });
}

/**
 * マッチデータを構築する
 * @param {Object} match - マッチオブジェクト
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {Object[]} goals - 得点データ
 * @param {Object} memberMap - メンバーマップ
 * @return {Object} マッチデータ
 */
function buildMatchData_(match, matchMembers, goals, memberMap) {
  var mId = match['マッチID'];

  // チーム別メンバーIDを抽出
  var teamIds = { A: [], B: [] };
  matchMembers.forEach(function(mm) {
    if (mm['マッチID'] === mId && teamIds[mm['チーム']]) {
      teamIds[mm['チーム']].push(mm['メンバーID']);
    }
  });

  // 得点データを集計
  var matchGoals = goals.filter(function(g) { return g['マッチID'] === mId; });
  var scoreA = 0, scoreB = 0;
  var memberGoalCounts = {};

  matchGoals.forEach(function(g) {
    if (g['チーム'] === 'A') scoreA++;
    if (g['チーム'] === 'B') scoreB++;
    if (g['種別'] === '通常' && g['メンバーID']) {
      var key = g['メンバーID'];
      memberGoalCounts[key] = (memberGoalCounts[key] || 0) + 1;
    }
  });

  /**
   * メンバーIDの配列をクライアント用オブジェクト配列に変換する
   * @param {string[]} ids - メンバーIDの配列
   * @return {Object[]}
   */
  var toMemberList = function(ids) {
    return ids.map(function(id) {
      var m = memberMap[id] || {};
      return { id: id, name: m['名前'] || '不明', experience: m['サッカー経験'] || 'なし' };
    });
  };

  return {
    id: mId,
    matchNumber: match['マッチ番号'],
    teamAName: match['チームA名'],
    teamBName: match['チームB名'],
    scoreA: scoreA,
    scoreB: scoreB,
    status: match['ステータス'],
    teamA: toMemberList(teamIds.A),
    teamB: toMemberList(teamIds.B),
    goals: matchGoals.map(function(g) {
      var memberId = g['メンバーID'] || '';
      var memberName = memberId ? ((memberMap[memberId] || {})['名前'] || '不明') : '';
      return {
        goalId: g['得点ID'],
        team: g['チーム'],
        memberId: memberId,
        name: memberName,
        type: g['種別']
      };
    }),
    memberGoals: Object.keys(memberGoalCounts).map(function(memberId) {
      return {
        memberId: memberId,
        name: (memberMap[memberId] || {})['名前'] || '不明',
        count: memberGoalCounts[memberId]
      };
    })
  };
}

/**
 * ラウンドを終了する（試合データは保持）
 * @param {string} roundId - ラウンドID
 * @return {Object} 結果オブジェクト { success, message }
 */
function endRound(roundId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('ラウンド');
  var rowIndex = findRowIndex_(sheet, 0, roundId);
  if (rowIndex === -1) return { success: false, message: 'ラウンドが見つかりません' };

  sheet.getRange(rowIndex, 5).setValue('終了');
  return { success: true, message: 'ラウンドを終了しました。新しいチーム分けを行いましょう！' };
}

// ===================================
// マッチ操作
// ===================================

/**
 * マッチを作成する（ラウンド内の2チーム対戦）
 * @param {string} roundId - ラウンドID
 * @param {string} teamAName - チームA名
 * @param {string} teamBName - チームB名
 * @param {string[]} teamAMembers - チームAのメンバーID配列
 * @param {string[]} teamBMembers - チームBのメンバーID配列
 * @return {Object} 結果オブジェクト { success, matchId, matchNumber, message }
 */
function createMatch(roundId, teamAName, teamBName, teamAMembers, teamBMembers) {
  var ss = getSpreadsheet_();
  var matchId = generateId_();

  var existing = getSheetData_('マッチ').filter(function(m) { return m['ラウンドID'] === roundId; });
  var matchNumber = existing.length + 1;

  ensureSheet_(ss, 'マッチ').appendRow([
    matchId, roundId, matchNumber,
    teamAName || 'チームA', teamBName || 'チームB',
    '進行中'
  ]);

  // マッチメンバーを一括書き込み
  var mmRows = [];
  teamAMembers.forEach(function(mId) { mmRows.push([matchId, mId, 'A']); });
  teamBMembers.forEach(function(mId) { mmRows.push([matchId, mId, 'B']); });

  if (mmRows.length > 0) {
    appendRows_(ensureSheet_(ss, 'マッチメンバー'), mmRows);
  }

  return {
    success: true,
    matchId: matchId,
    matchNumber: matchNumber,
    message: '第' + matchNumber + '試合キックオフ！'
  };
}

/**
 * 得点を追加する（1得点=1行）
 * @param {string} matchId - マッチID
 * @param {string} team - チーム（A / B）
 * @param {string} memberId - メンバーID（オウンゴール・不明の場合は空文字）
 * @param {string} type - 種別（通常 / オウンゴール / 不明）
 * @return {Object} 結果オブジェクト { success, goalId }
 */
function addGoal(matchId, team, memberId, type) {
  var ss = getSpreadsheet_();
  var sheet = ensureSheet_(ss, '得点');
  var goalId = generateId_();
  sheet.appendRow([goalId, matchId, team, memberId || '', type || '通常']);
  return { success: true, goalId: goalId };
}

/**
 * 得点を削除する
 * @param {string} goalId - 得点ID
 * @return {Object} 結果オブジェクト { success }
 */
function removeGoal(goalId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('得点');
  if (!sheet) return { success: false };

  var rowIndex = findRowIndex_(sheet, 0, goalId);
  if (rowIndex === -1) return { success: false };

  sheet.deleteRow(rowIndex);
  return { success: true };
}

/**
 * 指定メンバーの最新の得点を1つ削除する
 * @param {string} matchId - マッチID
 * @param {string} team - チーム（A / B）
 * @param {string} memberId - メンバーID（オウンゴール・不明の場合は空文字）
 * @param {string} type - 種別（通常 / オウンゴール / 不明）
 * @return {Object} 結果オブジェクト { success }
 */
function removeLatestGoal(matchId, team, memberId, type) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('得点');
  if (!sheet || sheet.getLastRow() < 2) return { success: false };

  var data = sheet.getDataRange().getValues();
  var normalizedMemberId = memberId || '';

  // 後ろから検索して最初に見つかった該当行を削除
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === matchId && data[i][2] === team &&
        data[i][3] === normalizedMemberId && data[i][4] === type) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

/**
 * マッチを終了する
 * @param {string} matchId - マッチID
 * @return {Object} 結果オブジェクト { success, message }
 */
function endMatch(matchId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false };

  sheet.getRange(rowIndex, 6).setValue('終了');
  return { success: true, message: '試合終了！次の戦いはもう始まっている' };
}

/**
 * 終了した試合を再開する
 * イベントが「試合終了」または「完了」の場合は再開不可
 * @param {string} matchId - マッチID
 * @return {Object} 結果オブジェクト { success, message }
 */
function reopenMatch(matchId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false, message: '試合が見つかりません' };

  var data = getMultipleSheetData_(['マッチ', 'ラウンド', 'イベント']);

  var matchData = data['マッチ'].find(function(m) { return m['マッチID'] === matchId; });
  if (!matchData) return { success: false, message: '試合が見つかりません' };

  var roundData = data['ラウンド'].find(function(r) { return r['ラウンドID'] === matchData['ラウンドID']; });
  if (!roundData) return { success: false, message: 'ラウンドが見つかりません' };

  var event = data['イベント'].find(function(e) { return e['イベントID'] === roundData['イベントID']; });
  var eventStatus = event ? event['ステータス'] : '';
  if (eventStatus === '試合終了' || eventStatus === '完了') {
    return { success: false, message: 'イベント終了後は編集できません' };
  }

  sheet.getRange(rowIndex, 6).setValue('進行中');
  return { success: true, message: '試合を再開しました。スコアを編集できます' };
}
