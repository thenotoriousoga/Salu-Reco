// ===================================
// ラウンド（チーム分け・試合）管理
// ===================================

function getRounds(eventId) {
  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundMembers = getSheetData_('ラウンドメンバー');
  var goals = getSheetData_('得点');
  var members = getSheetData_('メンバー');

  var memberMap = buildMap_(members, 'メンバーID');

  return rounds.map(function(round) {
    var rId = round['ラウンドID'];
    var teamAIds = roundMembers
      .filter(function(rm) { return rm['ラウンドID'] === rId && rm['チーム'] === 'A'; })
      .map(function(rm) { return rm['メンバーID']; });
    var teamBIds = roundMembers
      .filter(function(rm) { return rm['ラウンドID'] === rId && rm['チーム'] === 'B'; })
      .map(function(rm) { return rm['メンバーID']; });
    var roundGoals = goals.filter(function(g) { return g['ラウンドID'] === rId; });

    return {
      id: rId,
      roundNumber: round['ラウンド番号'],
      teamAName: round['チームA名'],
      teamBName: round['チームB名'],
      scoreA: round['スコアA'],
      scoreB: round['スコアB'],
      status: round['ステータス'],
      teamA: teamAIds.map(function(id) {
        var m = memberMap[id] || {};
        return { id: id, name: m['名前'] || '不明', experience: m['サッカー経験'] || 'なし' };
      }),
      teamB: teamBIds.map(function(id) {
        var m = memberMap[id] || {};
        return { id: id, name: m['名前'] || '不明', experience: m['サッカー経験'] || 'なし' };
      }),
      goals: roundGoals.map(function(g) {
        return { memberId: g['メンバーID'], name: (memberMap[g['メンバーID']] || {})['名前'] || '不明', count: g['得点数'] };
      })
    };
  }).sort(function(a, b) { return a.roundNumber - b.roundNumber; });
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

// --- AI自動チーム分け（経験・年次考慮） ---
function autoSplitTeams(eventId, memberIds) {
  if (!memberIds || memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }

  var members = getSheetData_('メンバー');
  var memberMap = buildMap_(members, 'メンバーID');

  var scored = scoreMembersForSplit_(memberIds, memberMap);

  // 蛇行ドラフト方式で分配
  var teamA = [];
  var teamB = [];
  scored.forEach(function(p, i) {
    var round = Math.floor(i / 2);
    if (round % 2 === 0) {
      (i % 2 === 0) ? teamA.push(p.id) : teamB.push(p.id);
    } else {
      (i % 2 === 0) ? teamB.push(p.id) : teamA.push(p.id);
    }
  });

  return { success: true, teamA: teamA, teamB: teamB };
}

// --- ランダムチーム分け ---
function randomSplitTeams(memberIds) {
  if (!memberIds || memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }
  var shuffled = memberIds.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }
  var half = Math.ceil(shuffled.length / 2);
  return { success: true, teamA: shuffled.slice(0, half), teamB: shuffled.slice(half) };
}

// --- ラウンド作成 ---
function createRound(eventId, teamAName, teamBName, teamAMembers, teamBMembers) {
  var ss = getSpreadsheet_();
  var roundId = generateId_();
  var existingRounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundNumber = existingRounds.length + 1;

  ss.getSheetByName('ラウンド').appendRow([
    roundId, eventId, roundNumber,
    teamAName || 'チームA', teamBName || 'チームB',
    0, 0, '進行中'
  ]);

  var rmSheet = ss.getSheetByName('ラウンドメンバー');
  teamAMembers.forEach(function(mId) { rmSheet.appendRow([roundId, mId, 'A']); });
  teamBMembers.forEach(function(mId) { rmSheet.appendRow([roundId, mId, 'B']); });

  updateEventStatus(eventId, '進行中');

  return { success: true, roundId: roundId, roundNumber: roundNumber, message: '第' + roundNumber + '試合を作成しました' };
}

// --- スコア更新 ---
function updateRoundScore(roundId, scoreA, scoreB) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('ラウンド');
  var rowIndex = findRowIndex_(sheet, 0, roundId);
  if (rowIndex === -1) return { success: false };
  sheet.getRange(rowIndex, 6).setValue(Number(scoreA));
  sheet.getRange(rowIndex, 7).setValue(Number(scoreB));
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
  sheet.getRange(rowIndex, 8).setValue('終了');
  return { success: true, message: '試合を終了しました' };
}

// --- ラウンド削除 ---
function deleteRound(roundId) {
  deleteRowsByMatch_('ラウンドメンバー', 0, roundId);
  deleteRowsByMatch_('得点', 0, roundId);
  deleteRowsByMatch_('ラウンド', 0, roundId);
  return { success: true, message: 'ラウンドを削除しました' };
}
