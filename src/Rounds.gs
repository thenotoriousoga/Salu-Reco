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

  // LINE通知: チーム分け結果（非同期で実行）
  scheduleNotification_('notifyTeamSplit', [eventId, teamNames, teams, roundNumber]);

  return {
    success: true,
    roundId: roundId,
    roundNumber: roundNumber,
    message: 'ラウンド' + roundNumber + '開始！ピッチがあなたを待っている'
  };
}

/**
 * ラウンド配列からクライアント用データ構造を構築する
 * getEventDetail の内部処理
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

  // チーム別メンバーIDを抽出（助っ人フラグも保持）
  var teamIds = { A: [], B: [] };
  var subMap = {}; // memberId => true（助っ人）
  matchMembers.forEach(function(mm) {
    if (mm['マッチID'] === mId && teamIds[mm['チーム']]) {
      teamIds[mm['チーム']].push(mm['メンバーID']);
      if (mm['助っ人'] === 'はい') {
        subMap[mm['チーム'] + ':' + mm['メンバーID']] = true;
      }
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
   * @param {string} team - チーム識別子（A / B）
   * @return {Object[]}
   */
  var toMemberList = function(ids, team) {
    return ids.map(function(id) {
      var m = memberMap[id] || {};
      return {
        id: id,
        name: m['名前'] || '不明',
        experience: m['サッカー経験'] || 'なし',
        isSub: !!subMap[team + ':' + id]
      };
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
    teamA: toMemberList(teamIds.A, 'A'),
    teamB: toMemberList(teamIds.B, 'B'),
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
 * 進行中のマッチがある場合は終了不可
 * @param {string} roundId - ラウンドID
 * @return {Object} 結果オブジェクト { success, message }
 */
function endRound(roundId) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('ラウンド');
  var rowIndex = findRowIndex_(sheet, 0, roundId);
  if (rowIndex === -1) return { success: false, message: 'ラウンドが見つかりません' };

  // 進行中マッチのチェック
  var matches = getSheetData_('マッチ').filter(function(m) { return m['ラウンドID'] === roundId; });
  if (matches.some(function(m) { return m['ステータス'] !== '終了'; })) {
    return { success: false, message: '進行中の試合があります。先に試合を終了してください' };
  }

  sheet.getRange(rowIndex, 5).setValue('終了');

  // LINE通知: ラウンド結果サマリ（非同期で実行）
  scheduleNotification_('notifyRoundResult', [roundId]);

  return { success: true, message: 'ラウンドを終了しました。新しいチーム分けを行いましょう！' };
}

// ===================================
// マッチ操作
// ===================================

/**
 * マッチを作成する（ラウンド内の2チーム対戦）
 * 助っ人は試合中に追加され、endMatch 時にまとめて保存される。
 * @param {string} roundId - ラウンドID
 * @param {string} teamAName - チームA名
 * @param {string} teamBName - チームB名
 * @param {string[]} teamAMembers - チームAのメンバーID配列（ラウンドの所属チーム）
 * @param {string[]} teamBMembers - チームBのメンバーID配列（ラウンドの所属チーム）
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

  // マッチメンバーを一括書き込み（通常参加: 助っ人='いいえ'）
  var mmRows = [];
  (teamAMembers || []).forEach(function(mId) { mmRows.push([matchId, mId, 'A', 'いいえ']); });
  (teamBMembers || []).forEach(function(mId) { mmRows.push([matchId, mId, 'B', 'いいえ']); });

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
 * マッチを終了し、得点データと試合中に追加された助っ人を一括保存する
 * @param {string} matchId - マッチID
 * @param {Object[]} goals - 得点データの配列
 *   各要素: { team: string, memberId: string, type: string }
 * @param {Object[]} [newSubs] - 試合中に追加された助っ人の配列
 *   各要素: { memberId: string, team: string }
 * @return {Object} 結果オブジェクト { success, message }
 */
function endMatch(matchId, goals, newSubs) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false };

  // 助っ人の追加（試合中に増えた分のみ、既存マッチメンバーには影響させない）
  if (newSubs && newSubs.length > 0) {
    appendNewSubs_(matchId, newSubs);
  }

  // 既存の得点を削除して新しい得点を一括書き込み
  deleteRowsByMatch_('得点', 1, matchId);
  if (goals && goals.length > 0) {
    var rows = goals.map(function(g) {
      return [generateId_(), matchId, g.team, g.memberId || '', g.type || '通常'];
    });
    appendRows_(ensureSheet_(ss, '得点'), rows);
  }

  sheet.getRange(rowIndex, 6).setValue('終了');
  return { success: true, message: '試合終了！次の戦いはもう始まっている' };
}

/**
 * 指定マッチに助っ人を一括追加する（endMatchの内部処理）
 * 同一イベントのメンバーかつ、まだマッチメンバーに含まれていない場合のみ追加する。
 * @param {string} matchId - マッチID
 * @param {Object[]} newSubs - 追加する助っ人の配列 [{ memberId, team }, ...]
 */
function appendNewSubs_(matchId, newSubs) {
  var ss = getSpreadsheet_();
  var data = getMultipleSheetData_(['マッチ', 'ラウンド', 'マッチメンバー', 'メンバー']);

  var match = data['マッチ'].find(function(m) { return m['マッチID'] === matchId; });
  if (!match) return;
  var round = data['ラウンド'].find(function(r) { return r['ラウンドID'] === match['ラウンドID']; });
  if (!round) return;
  var eventId = round['イベントID'];

  // 既存マッチメンバー（重複排除用）
  var existingIds = {};
  data['マッチメンバー'].forEach(function(mm) {
    if (mm['マッチID'] === matchId) existingIds[mm['メンバーID']] = true;
  });

  // 同一イベントの有効メンバーかどうか判定するためのセット
  var eventMemberIds = {};
  data['メンバー'].forEach(function(m) {
    if (m['イベントID'] === eventId) eventMemberIds[m['メンバーID']] = true;
  });

  var rows = [];
  newSubs.forEach(function(s) {
    if (!s || !s.memberId) return;
    if (s.team !== 'A' && s.team !== 'B') return;
    if (existingIds[s.memberId]) return;        // すでに出場登録済み
    if (!eventMemberIds[s.memberId]) return;    // このイベントのメンバーではない
    existingIds[s.memberId] = true;
    rows.push([matchId, s.memberId, s.team, 'はい']);
  });

  if (rows.length > 0) {
    appendRows_(ensureSheet_(ss, 'マッチメンバー'), rows);
  }
}

/**
 * 終了した試合を再開する
 * イベントが「イベント終了」の場合は再開不可
 * ラウンドが「終了」になっていれば、マッチ再開に合わせてラウンドも「進行中」に戻す
 * @param {string} matchId - マッチID
 * @return {Object} 結果オブジェクト { success, message }
 */
function reopenMatch(matchId) {
  var ss = getSpreadsheet_();
  var matchSheet = ss.getSheetByName('マッチ');
  var matchRow = findRowIndex_(matchSheet, 0, matchId);
  if (matchRow === -1) return { success: false, message: '試合が見つかりません' };

  var data = getMultipleSheetData_(['マッチ', 'ラウンド', 'イベント']);

  var matchData = data['マッチ'].find(function(m) { return m['マッチID'] === matchId; });
  if (!matchData) return { success: false, message: '試合が見つかりません' };

  var roundData = data['ラウンド'].find(function(r) { return r['ラウンドID'] === matchData['ラウンドID']; });
  if (!roundData) return { success: false, message: 'ラウンドが見つかりません' };

  var event = data['イベント'].find(function(e) { return e['イベントID'] === roundData['イベントID']; });
  var eventStatus = event ? event['ステータス'] : '';
  if (eventStatus === 'イベント終了') {
    return { success: false, message: 'イベント終了後は編集できません' };
  }

  // マッチを進行中に戻す
  matchSheet.getRange(matchRow, 6).setValue('進行中');

  // ラウンドが終了していたら同時に進行中へ戻す（ステータス整合性を維持）
  if (roundData['ステータス'] === '終了') {
    var roundSheet = ss.getSheetByName('ラウンド');
    var roundRow = findRowIndex_(roundSheet, 0, roundData['ラウンドID']);
    if (roundRow !== -1) {
      roundSheet.getRange(roundRow, 5).setValue('進行中');
    }
  }

  return { success: true, message: '試合を再開しました。スコアを編集できます' };
}

/**
 * 終了した試合のスコアと得点者を直接修正する（試合を再開せずに）
 * スコアは得点テーブルから動的に計算されるため、goals の更新のみ行う
 * @param {string} matchId - マッチID
 * @param {number} _scoreA - （未使用・後方互換のため残存）
 * @param {number} _scoreB - （未使用・後方互換のため残存）
 * @param {Object[]} goals - 得点データ配列 [{ team, memberId, type }, ...]
 * @return {Object} 結果オブジェクト { success, message }
 */
function correctMatchScore(matchId, _scoreA, _scoreB, goals) {
  var ss = getSpreadsheet_();
  var matchSheet = ss.getSheetByName('マッチ');
  var matchRow = findRowIndex_(matchSheet, 0, matchId);
  if (matchRow === -1) return { success: false, message: '試合が見つかりません' };

  var data = getMultipleSheetData_(['マッチ', 'ラウンド', 'イベント']);
  var matchData = data['マッチ'].find(function(m) { return m['マッチID'] === matchId; });
  if (!matchData) return { success: false, message: '試合が見つかりません' };

  var roundData = data['ラウンド'].find(function(r) { return r['ラウンドID'] === matchData['ラウンドID']; });
  if (!roundData) return { success: false, message: 'ラウンドが見つかりません' };

  var event = data['イベント'].find(function(e) { return e['イベントID'] === roundData['イベントID']; });
  var eventStatus = event ? event['ステータス'] : '';
  if (eventStatus === 'イベント終了') {
    return { success: false, message: 'イベント終了後は編集できません' };
  }

  // 得点データを更新（スコアは得点テーブルから動的に計算されるため直接保存は不要）
  if (goals) {
    deleteRowsByMatch_('得点', 1, matchId);
    if (goals.length > 0) {
      var rows = goals.map(function(g) {
        return [generateId_(), matchId, g.team, g.memberId || '', g.type || '通常'];
      });
      appendRows_(ensureSheet_(ss, '得点'), rows);
    }
  }

  return { success: true, message: 'スコアを修正しました' };
}

// ===================================
// 助っ人（別チームからの参戦）
// ===================================
// 助っ人は createMatch 時にまとめて登録する。
// 試合開始後の助っ人の追加・削除はサポートしない（編集したい場合はマッチを削除して作り直す）。
