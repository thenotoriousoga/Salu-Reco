// ===================================
// ラウンド・マッチ管理
// ラウンド = チーム分けの単位（Nチーム）
// マッチ = 2チーム対戦（ラウンド内の個別試合）
// ===================================

/**
 * チームラベルを返す（A, B, C, D, E, ...）
 * @param {number} index - 0始まりのインデックス
 * @return {string} チームラベル
 */
function teamLabel_(index) {
  return String.fromCharCode(65 + index);
}

/**
 * 選択人数から最大チーム数を計算する（1チーム最低3人）
 * @param {number} playerCount - 選択人数
 * @return {number} 最大チーム数
 */
function maxTeamCount_(playerCount) {
  return Math.max(2, Math.floor(playerCount / 3));
}

/**
 * メンバーにスコアを付与する（チーム分け用）
 * @param {string[]} memberIds - メンバーIDの配列
 * @param {Object} memberMap - メンバーマップ
 * @return {Object[]} スコア付きメンバー配列（スコア降順）
 */
function scoreMembersForSplit_(memberIds, memberMap) {
  var scored = memberIds.map(function(id) {
    var m = memberMap[id] || {};
    var expScore = (m['サッカー経験'] === 'あり') ? 2 : 0;
    var yearScore = Math.min(Number(m['年次']) || 1, 10) / 10;
    return { id: id, score: expScore + yearScore };
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored;
}

/**
 * AI自動チーム分け（経験・年次考慮、Nチーム対応）
 * @param {string} eventId - イベントID
 * @param {string[]} memberIds - メンバーIDの配列
 * @param {number} [teamCount] - チーム数（省略時は2）
 * @return {Object} { success, teams: string[][] }
 */
function autoSplitTeams(eventId, memberIds, teamCount) {
  teamCount = Number(teamCount) || 2;
  if (!memberIds || memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }
  if (memberIds.length < teamCount * 2) {
    return { success: false, message: teamCount + 'チームには最低' + (teamCount * 2) + '人必要です' };
  }
  var maxT = maxTeamCount_(memberIds.length);
  if (teamCount > maxT) {
    return { success: false, message: memberIds.length + '人では最大' + maxT + 'チームです（1チーム最低3人）' };
  }
  var members = getSheetData_('メンバー');
  var memberMap = buildMap_(members, 'メンバーID');
  var scored = scoreMembersForSplit_(memberIds, memberMap);
  var teams = [];
  for (var t = 0; t < teamCount; t++) { teams.push([]); }
  scored.forEach(function(p, i) {
    var round = Math.floor(i / teamCount);
    var pos = i % teamCount;
    var teamIdx = (round % 2 === 0) ? pos : (teamCount - 1 - pos);
    teams[teamIdx].push(p.id);
  });
  return { success: true, teams: teams };
}

/**
 * ランダムチーム分け（Nチーム対応）
 * @param {string[]} memberIds - メンバーIDの配列
 * @param {number} [teamCount] - チーム数（省略時は2）
 * @return {Object} { success, teams: string[][] }
 */
function randomSplitTeams(memberIds, teamCount) {
  teamCount = Number(teamCount) || 2;
  if (!memberIds || memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }
  if (memberIds.length < teamCount * 2) {
    return { success: false, message: teamCount + 'チームには最低' + (teamCount * 2) + '人必要です' };
  }
  var maxT = maxTeamCount_(memberIds.length);
  if (teamCount > maxT) {
    return { success: false, message: memberIds.length + '人では最大' + maxT + 'チームです（1チーム最低3人）' };
  }
  var shuffled = memberIds.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }
  var teams = [];
  for (var t = 0; t < teamCount; t++) { teams.push([]); }
  shuffled.forEach(function(id, idx) {
    teams[idx % teamCount].push(id);
  });
  return { success: true, teams: teams };
}

// ===================================
// ラウンド（チーム分けの単位）
// ===================================

/**
 * ラウンドを作成する（チーム分け結果を保存）
 * @param {string} eventId - イベントID
 * @param {string[]} teamNames - チーム名の配列
 * @param {string[][]} teams - チームごとのメンバーID配列
 * @return {Object} 結果オブジェクト
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
  return { success: true, roundId: roundId, roundNumber: roundNumber, message: 'ラウンド' + roundNumber + 'を作成しました' };
}

/**
 * イベントのラウンド一覧を取得する（マッチ情報含む）
 * @param {string} eventId - イベントID
 * @return {Object[]} ラウンドデータの配列
 */
function getRounds(eventId) {
  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var allMatches = getSheetData_('マッチ');
  var matchMembers = getSheetData_('マッチメンバー');
  var goals = getSheetData_('得点');
  var members = getSheetData_('メンバー');
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
          return { memberId: g['メンバーID'], name: (memberMap[g['メンバーID']] || {})['名前'] || '不明', count: g['得点数'] };
        })
      };
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
 * ラウンドを削除する（配下のマッチも全て削除）
 * @param {string} roundId - ラウンドID
 * @return {Object} 結果オブジェクト
 */
function deleteRound(roundId) {
  var matches = getSheetData_('マッチ').filter(function(m) { return m['ラウンドID'] === roundId; });
  matches.forEach(function(m) {
    deleteRowsByMatch_('マッチメンバー', 0, m['マッチID']);
    deleteRowsByMatch_('得点', 0, m['マッチID']);
  });
  deleteRowsByMatch_('マッチ', 1, roundId);
  deleteRowsByMatch_('ラウンド', 0, roundId);
  return { success: true, message: 'ラウンドを削除しました' };
}

// ===================================
// マッチ（2チーム対戦）
// ===================================

/**
 * マッチを作成する（ラウンド内の2チーム対戦）
 * @param {string} roundId - ラウンドID
 * @param {string} teamAName - チームA名
 * @param {string} teamBName - チームB名
 * @param {string[]} teamAMembers - チームAのメンバーID配列
 * @param {string[]} teamBMembers - チームBのメンバーID配列
 * @return {Object} 結果オブジェクト
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

  var mmSheet = ensureSheet_(ss, 'マッチメンバー');
  teamAMembers.forEach(function(mId) { mmSheet.appendRow([matchId, mId, 'A']); });
  teamBMembers.forEach(function(mId) { mmSheet.appendRow([matchId, mId, 'B']); });

  return { success: true, matchId: matchId, matchNumber: matchNumber, message: '第' + matchNumber + '試合を作成しました' };
}

/**
 * マッチのスコアを更新する
 * @param {string} matchId - マッチID
 * @param {number} scoreA - チームAのスコア
 * @param {number} scoreB - チームBのスコア
 * @return {Object} 結果オブジェクト
 */
function updateMatchScore(matchId, scoreA, scoreB) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false };
  sheet.getRange(rowIndex, 6).setValue(Number(scoreA));
  sheet.getRange(rowIndex, 7).setValue(Number(scoreB));
  return { success: true };
}

/**
 * 得点を記録する
 * @param {string} matchId - マッチID
 * @param {string} memberId - メンバーID
 * @param {number} goalCount - 得点数
 * @return {Object} 結果オブジェクト
 */
function recordGoal(matchId, memberId, goalCount) {
  var ss = getSpreadsheet_();
  var sheet = ensureSheet_(ss, '得点');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === matchId && data[i][1] === memberId) {
      sheet.getRange(i + 1, 3).setValue(Number(goalCount));
      return { success: true };
    }
  }
  sheet.appendRow([matchId, memberId, Number(goalCount)]);
  return { success: true };
}

/**
 * マッチを終了する
 * @param {string} matchId - マッチID
 * @return {Object} 結果オブジェクト
 */
function endMatch(matchId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false };
  sheet.getRange(rowIndex, 8).setValue('終了');
  return { success: true, message: '試合を終了しました' };
}

/**
 * マッチを削除する
 * @param {string} matchId - マッチID
 * @return {Object} 結果オブジェクト
 */
function deleteMatch(matchId) {
  deleteRowsByMatch_('マッチメンバー', 0, matchId);
  deleteRowsByMatch_('得点', 0, matchId);
  deleteRowsByMatch_('マッチ', 0, matchId);
  return { success: true, message: '試合を削除しました' };
}
