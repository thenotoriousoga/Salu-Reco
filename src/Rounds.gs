// ===================================
// ラウンド（チーム分け・試合）管理
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

function getRounds(eventId) {
  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundMembers = getSheetData_('ラウンドメンバー');
  var goals = getSheetData_('得点');
  var members = getSheetData_('メンバー');

  var memberMap = buildMap_(members, 'メンバーID');

  return rounds.map(function(round) {
    var rId = round['ラウンドID'];

    // チーム名・スコアをJSONからパース
    var teamNames = parseJson_(round['チーム名JSON'], ['チームA', 'チームB']);
    var scores = parseJson_(round['スコアJSON'], [0, 0]);

    // チーム数分のチームデータを構築
    var teams = teamNames.map(function(name, idx) {
      var label = teamLabel_(idx);
      var memberIds = roundMembers
        .filter(function(rm) { return rm['ラウンドID'] === rId && rm['チーム'] === label; })
        .map(function(rm) { return rm['メンバーID']; });
      return {
        label: label,
        name: name,
        score: Number(scores[idx]) || 0,
        members: memberIds.map(function(id) {
          var m = memberMap[id] || {};
          return { id: id, name: m['名前'] || '不明', experience: m['サッカー経験'] || 'なし' };
        })
      };
    });

    var roundGoals = goals.filter(function(g) { return g['ラウンドID'] === rId; });

    return {
      id: rId,
      roundNumber: round['ラウンド番号'],
      teamCount: teamNames.length,
      teams: teams,
      // 後方互換用（2チームの場合）
      teamAName: teamNames[0] || 'チームA',
      teamBName: teamNames[1] || 'チームB',
      scoreA: Number(scores[0]) || 0,
      scoreB: Number(scores[1]) || 0,
      teamA: teams[0] ? teams[0].members : [],
      teamB: teams[1] ? teams[1].members : [],
      status: round['ステータス'],
      goals: roundGoals.map(function(g) {
        return { memberId: g['メンバーID'], name: (memberMap[g['メンバーID']] || {})['名前'] || '不明', count: g['得点数'] };
      })
    };
  }).sort(function(a, b) { return a.roundNumber - b.roundNumber; });
}

/**
 * JSON文字列をパースする。失敗時はデフォルト値を返す
 * @param {string} jsonStr - JSON文字列
 * @param {*} defaultVal - デフォルト値
 * @return {*} パース結果
 */
function parseJson_(jsonStr, defaultVal) {
  if (!jsonStr) return defaultVal;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return defaultVal;
  }
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
 * 蛇行ドラフト方式でスコア順にチームへ分配する
 * @param {string} eventId - イベントID
 * @param {string[]} memberIds - メンバーIDの配列
 * @param {number} [teamCount] - チーム数（省略時は2）
 * @return {Object} 結果オブジェクト
 */
function autoSplitTeams(eventId, memberIds, teamCount) {
  teamCount = Number(teamCount) || 2;
  if (!memberIds || memberIds.length < teamCount * 2) {
    return { success: false, message: teamCount + 'チームには最低' + (teamCount * 2) + '人必要です' };
  }
  if (memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }

  var maxT = maxTeamCount_(memberIds.length);
  if (teamCount > maxT) {
    return { success: false, message: memberIds.length + '人では最大' + maxT + 'チームです（1チーム最低3人）' };
  }

  var members = getSheetData_('メンバー');
  var memberMap = buildMap_(members, 'メンバーID');
  var scored = scoreMembersForSplit_(memberIds, memberMap);

  // 蛇行ドラフト方式でNチームに分配
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
 * @return {Object} 結果オブジェクト
 */
function randomSplitTeams(memberIds, teamCount) {
  teamCount = Number(teamCount) || 2;
  if (!memberIds || memberIds.length < teamCount * 2) {
    return { success: false, message: teamCount + 'チームには最低' + (teamCount * 2) + '人必要です' };
  }
  if (memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }

  var maxT = maxTeamCount_(memberIds.length);
  if (teamCount > maxT) {
    return { success: false, message: memberIds.length + '人では最大' + maxT + 'チームです（1チーム最低3人）' };
  }

  // Fisher-Yatesシャッフル
  var shuffled = memberIds.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }

  // ラウンドロビンで分配
  var teams = [];
  for (var t = 0; t < teamCount; t++) { teams.push([]); }
  shuffled.forEach(function(id, idx) {
    teams[idx % teamCount].push(id);
  });

  return { success: true, teams: teams };
}

/**
 * ラウンド作成（Nチーム対応）
 * @param {string} eventId - イベントID
 * @param {string[]} teamNames - チーム名の配列
 * @param {string[][]} teamMembers - チームごとのメンバーID配列の配列
 * @return {Object} 結果オブジェクト
 */
function createRound(eventId, teamNames, teamMembers) {
  var ss = getSpreadsheet_();
  var roundId = generateId_();
  var existingRounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundNumber = existingRounds.length + 1;

  var teamCount = teamNames.length;
  var scores = [];
  for (var i = 0; i < teamCount; i++) { scores.push(0); }

  ss.getSheetByName('ラウンド').appendRow([
    roundId, eventId, roundNumber,
    JSON.stringify(teamNames),
    JSON.stringify(scores),
    '進行中'
  ]);

  var rmSheet = ss.getSheetByName('ラウンドメンバー');
  teamMembers.forEach(function(members, idx) {
    var label = teamLabel_(idx);
    members.forEach(function(mId) { rmSheet.appendRow([roundId, mId, label]); });
  });

  updateEventStatus(eventId, '進行中');

  return { success: true, roundId: roundId, roundNumber: roundNumber, message: '第' + roundNumber + '試合を作成しました' };
}

/**
 * スコア更新（Nチーム対応）
 * @param {string} roundId - ラウンドID
 * @param {number[]} scores - スコアの配列
 * @return {Object} 結果オブジェクト
 */
function updateRoundScore(roundId, scores) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('ラウンド');
  var rowIndex = findRowIndex_(sheet, 0, roundId);
  if (rowIndex === -1) return { success: false };
  sheet.getRange(rowIndex, 5).setValue(JSON.stringify(scores));
  return { success: true };
}

// --- 得点記録 ---
function recordGoal(roundId, memberId, goalCount) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('得点');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === roundId && data[i][1] === memberId) {
      sheet.getRange(i + 1, 3).setValue(Number(goalCount));
      return { success: true };
    }
  }
  sheet.appendRow([roundId, memberId, Number(goalCount)]);
  return { success: true };
}

// --- ラウンド終了 ---
function endRound(roundId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('ラウンド');
  var rowIndex = findRowIndex_(sheet, 0, roundId);
  if (rowIndex === -1) return { success: false };
  sheet.getRange(rowIndex, 6).setValue('終了');
  return { success: true, message: '試合を終了しました' };
}

// --- ラウンド削除 ---
function deleteRound(roundId) {
  deleteRowsByMatch_('ラウンドメンバー', 0, roundId);
  deleteRowsByMatch_('得点', 0, roundId);
  deleteRowsByMatch_('ラウンド', 0, roundId);
  return { success: true, message: 'ラウンドを削除しました' };
}
