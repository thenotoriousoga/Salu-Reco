// ===================================
// ラウンド（チーム分け・試合）管理
// ===================================

function getRounds(eventId) {
  const rounds = getSheetData_('ラウンド').filter(r => r['イベントID'] === eventId);
  const roundMembers = getSheetData_('ラウンドメンバー');
  const goals = getSheetData_('得点');
  const members = getSheetData_('メンバー');

  const memberMap = {};
  members.forEach(m => { memberMap[m['ID']] = m; });

  return rounds.map(round => {
    const rId = round['ラウンドID'];
    const teamAIds = roundMembers.filter(rm => rm['ラウンドID'] === rId && rm['チーム'] === 'A').map(rm => rm['メンバーID']);
    const teamBIds = roundMembers.filter(rm => rm['ラウンドID'] === rId && rm['チーム'] === 'B').map(rm => rm['メンバーID']);
    const roundGoals = goals.filter(g => g['ラウンドID'] === rId);

    return {
      id: rId,
      eventId: round['イベントID'],
      roundNumber: round['ラウンド番号'],
      teamAName: round['チームA名'],
      teamBName: round['チームB名'],
      scoreA: round['スコアA'],
      scoreB: round['スコアB'],
      status: round['ステータス'],
      teamA: teamAIds.map(id => ({
        id: id,
        name: (memberMap[id] || {})['名前'] || '不明',
        experience: (memberMap[id] || {})['サッカー経験'] || 'なし'
      })),
      teamB: teamBIds.map(id => ({
        id: id,
        name: (memberMap[id] || {})['名前'] || '不明',
        experience: (memberMap[id] || {})['サッカー経験'] || 'なし'
      })),
      goals: roundGoals.map(g => ({
        memberId: g['メンバーID'],
        name: (memberMap[g['メンバーID']] || {})['名前'] || '不明',
        count: g['得点数']
      }))
    };
  }).sort((a, b) => a.roundNumber - b.roundNumber);
}

function getNextRoundNumber_(eventId) {
  const rounds = getSheetData_('ラウンド').filter(r => r['イベントID'] === eventId);
  return rounds.length + 1;
}

// --- AI自動チーム分け ---
// サッカー経験・年次を考慮してバランスよく分ける
function autoSplitTeams(eventId, memberIds) {
  if (!memberIds || memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }

  const members = getSheetData_('メンバー');
  const memberMap = {};
  members.forEach(m => { memberMap[m['ID']] = m; });

  // メンバーにスコアを付与（経験者は高スコア）
  const scored = memberIds.map(id => {
    const m = memberMap[id] || {};
    const expScore = (m['サッカー経験'] === 'あり') ? 2 : 0;
    const yearScore = Math.min(Number(m['年次']) || 1, 10) / 10; // 0.1-1.0
    return { id: id, score: expScore + yearScore };
  });

  // スコア降順でソート
  scored.sort((a, b) => b.score - a.score);

  // 蛇行ドラフト方式で分配（1,2,2,1,1,2,...）
  const teamA = [];
  const teamB = [];
  scored.forEach((p, i) => {
    const round = Math.floor(i / 2);
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
  const shuffled = [...memberIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const half = Math.ceil(shuffled.length / 2);
  return { success: true, teamA: shuffled.slice(0, half), teamB: shuffled.slice(half) };
}

// --- ラウンド作成 ---
function createRound(eventId, teamAName, teamBName, teamAMembers, teamBMembers) {
  const ss = getSpreadsheet_();
  const roundId = generateId_();
  const roundNumber = getNextRoundNumber_(eventId);

  const roundsSheet = ss.getSheetByName('ラウンド');
  roundsSheet.appendRow([
    roundId, eventId, roundNumber,
    teamAName || '第' + roundNumber + '試合 チームA',
    teamBName || '第' + roundNumber + '試合 チームB',
    0, 0, '進行中'
  ]);

  const rmSheet = ss.getSheetByName('ラウンドメンバー');
  teamAMembers.forEach(mId => { rmSheet.appendRow([roundId, mId, 'A']); });
  teamBMembers.forEach(mId => { rmSheet.appendRow([roundId, mId, 'B']); });

  // イベントステータスを進行中に
  updateEventStatus(eventId, '進行中');

  return { success: true, roundId: roundId, roundNumber: roundNumber, message: '第' + roundNumber + '試合を作成しました' };
}

// --- スコア更新 ---
function updateRoundScore(roundId, scoreA, scoreB) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('ラウンド');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === roundId) {
      sheet.getRange(i + 1, 6).setValue(Number(scoreA));
      sheet.getRange(i + 1, 7).setValue(Number(scoreB));
      return { success: true };
    }
  }
  return { success: false };
}

// --- 得点記録 ---
function recordGoal(roundId, memberId, goalCount) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('得点');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
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
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('ラウンド');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === roundId) {
      sheet.getRange(i + 1, 8).setValue('終了');
      return { success: true, message: '試合を終了しました' };
    }
  }
  return { success: false };
}

// --- ラウンド削除 ---
function deleteRound(roundId) {
  const ss = getSpreadsheet_();

  // ラウンド削除
  const roundSheet = ss.getSheetByName('ラウンド');
  const roundData = roundSheet.getDataRange().getValues();
  for (let i = roundData.length - 1; i >= 1; i--) {
    if (roundData[i][0] === roundId) {
      roundSheet.deleteRow(i + 1);
      break;
    }
  }

  // ラウンドメンバー削除
  deleteRowsByColumn_(ss, 'ラウンドメンバー', 0, roundId);
  // 得点削除
  deleteRowsByColumn_(ss, '得点', 0, roundId);

  return { success: true, message: 'ラウンドを削除しました' };
}
