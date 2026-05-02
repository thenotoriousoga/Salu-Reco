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
  // 複数シートを一括取得（個別取得より高速）
  var data = getMultipleSheetData_(['ラウンド', 'マッチ', 'マッチメンバー', '得点', 'メンバー']);

  var rounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });
  var allMatches = data['マッチ'];
  var matchMembers = data['マッチメンバー'];
  var goals = data['得点'];
  var members = data['メンバー'];
  var memberMap = buildMap_(members, 'メンバーID');

  return rounds.map(function(round) {
    var rId = round['ラウンドID'];
    var splitData = null;
    try { splitData = JSON.parse(round['チーム分けJSON']); } catch (e) { splitData = null; }

    // ラウンドに紐づくマッチ
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
 * マッチデータを構築する（内部用）
 * @param {Object} match - マッチオブジェクト
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {Object[]} goals - 得点データ
 * @param {Object} memberMap - メンバーマップ
 * @return {Object} マッチデータ
 */
function buildMatchData_(match, matchMembers, goals, memberMap) {
  var mId = match['マッチID'];

  var teamAIds = matchMembers
    .filter(function(mm) { return mm['マッチID'] === mId && mm['チーム'] === 'A'; })
    .map(function(mm) { return mm['メンバーID']; });

  var teamBIds = matchMembers
    .filter(function(mm) { return mm['マッチID'] === mId && mm['チーム'] === 'B'; })
    .map(function(mm) { return mm['メンバーID']; });

  var matchGoals = goals.filter(function(g) { return g['マッチID'] === mId; });

  return {
    id: mId,
    matchNumber: match['マッチ番号'],
    teamAName: match['チームA名'],
    teamBName: match['チームB名'],
    scoreA: match['スコアA'],
    scoreB: match['スコアB'],
    status: match['ステータス'],
    teamA: teamAIds.map(function(id) {
      var m = memberMap[id] || {};
      return { id: id, name: m['名前'] || '不明', experience: m['サッカー経験'] || 'なし' };
    }),
    teamB: teamBIds.map(function(id) {
      var m = memberMap[id] || {};
      return { id: id, name: m['名前'] || '不明', experience: m['サッカー経験'] || 'なし' };
    }),
    goals: matchGoals.map(function(g) {
      return {
        memberId: g['メンバーID'],
        name: (memberMap[g['メンバーID']] || {})['名前'] || '不明',
        count: g['得点数']
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
    0, 0, '進行中'
  ]);

  // マッチメンバーを一括書き込み（appendRowの繰り返しより高速）
  var mmRows = [];
  teamAMembers.forEach(function(mId) { mmRows.push([matchId, mId, 'A']); });
  teamBMembers.forEach(function(mId) { mmRows.push([matchId, mId, 'B']); });

  if (mmRows.length > 0) {
    var mmSheet = ensureSheet_(ss, 'マッチメンバー');
    var lastRow = mmSheet.getLastRow();
    mmSheet.getRange(lastRow + 1, 1, mmRows.length, mmRows[0].length).setValues(mmRows);
  }

  return {
    success: true,
    matchId: matchId,
    matchNumber: matchNumber,
    message: '第' + matchNumber + '試合キックオフ！'
  };
}

/**
 * マッチのスコアを更新する
 * @param {string} matchId - マッチID
 * @param {number} scoreA - チームAのスコア
 * @param {number} scoreB - チームBのスコア
 * @return {Object} 結果オブジェクト { success }
 */
function updateMatchScore(matchId, scoreA, scoreB) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false };

  // 2つのセルを一括更新（setValueの繰り返しより高速）
  sheet.getRange(rowIndex, 6, 1, 2).setValues([[Number(scoreA), Number(scoreB)]]);
  return { success: true };
}

/**
 * 得点を記録する
 * @param {string} matchId - マッチID
 * @param {string} memberId - メンバーID
 * @param {number} goalCount - 得点数
 * @return {Object} 結果オブジェクト { success }
 */
function recordGoal(matchId, memberId, goalCount) {
  var ss = getSpreadsheet_();
  var sheet = ensureSheet_(ss, '得点');
  var data = sheet.getDataRange().getValues();

  // 既存レコードを更新
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === matchId && data[i][1] === memberId) {
      sheet.getRange(i + 1, 3).setValue(Number(goalCount));
      return { success: true };
    }
  }

  // 新規レコードを追加
  sheet.appendRow([matchId, memberId, Number(goalCount)]);
  return { success: true };
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

  sheet.getRange(rowIndex, 8).setValue('終了');
  return { success: true, message: '試合終了！次の戦いはもう始まっている' };
}

/**
 * 終了した試合を再開する（スコア・得点を編集可能にする）
 * イベントが「試合終了」または「完了」の場合は再開不可
 * @param {string} matchId - マッチID
 * @return {Object} 結果オブジェクト { success, message }
 */
function reopenMatch(matchId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false, message: '試合が見つかりません' };

  // 必要なデータを一括取得
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

  sheet.getRange(rowIndex, 8).setValue('進行中');
  return { success: true, message: '試合を再開しました。スコアを編集できます' };
}
