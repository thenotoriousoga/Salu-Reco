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

  // マッチメンバーを一括書き込み（通常参加: 助っ人='いいえ'）
  var mmRows = [];
  teamAMembers.forEach(function(mId) { mmRows.push([matchId, mId, 'A', 'いいえ']); });
  teamBMembers.forEach(function(mId) { mmRows.push([matchId, mId, 'B', 'いいえ']); });

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
 * マッチを終了し、得点データを一括保存する
 * @param {string} matchId - マッチID
 * @param {Object[]} goals - 得点データの配列
 *   各要素: { team: string, memberId: string, type: string }
 * @return {Object} 結果オブジェクト { success, message }
 */
function endMatch(matchId, goals) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチ');
  var rowIndex = findRowIndex_(sheet, 0, matchId);
  if (rowIndex === -1) return { success: false };

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

// ===================================
// 助っ人（別チームからの参戦）
// ===================================

/**
 * マッチに助っ人メンバーを追加する
 * 同じイベントの任意のメンバーを、指定したチームに助っ人として出場登録できる。
 * 既にそのマッチに出場しているメンバーは追加できない（A/Bどちらのチームでも）。
 * イベントが「完了」の場合は追加不可。
 * @param {string} matchId - マッチID
 * @param {string} memberId - 追加するメンバーID
 * @param {string} team - チーム識別子（A / B）
 * @return {Object} 結果オブジェクト { success, message }
 */
function addSubstitute(matchId, memberId, team) {
  if (!matchId || !memberId || (team !== 'A' && team !== 'B')) {
    return { success: false, message: '入力が不正です' };
  }

  var ss = getSpreadsheet_();
  var data = getMultipleSheetData_(['マッチ', 'ラウンド', 'イベント', 'マッチメンバー', 'メンバー']);

  var match = data['マッチ'].find(function(m) { return m['マッチID'] === matchId; });
  if (!match) return { success: false, message: '試合が見つかりません' };

  var round = data['ラウンド'].find(function(r) { return r['ラウンドID'] === match['ラウンドID']; });
  if (!round) return { success: false, message: 'ラウンドが見つかりません' };

  var event = data['イベント'].find(function(e) { return e['イベントID'] === round['イベントID']; });
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] === '完了') {
    return { success: false, message: 'イベント完了後は助っ人を追加できません' };
  }

  // 同一イベントのメンバーか検証
  var member = data['メンバー'].find(function(m) {
    return m['メンバーID'] === memberId && m['イベントID'] === event['イベントID'];
  });
  if (!member) return { success: false, message: 'このイベントのメンバーではありません' };

  // 既に出場していないか検証
  var alreadyIn = data['マッチメンバー'].some(function(mm) {
    return mm['マッチID'] === matchId && mm['メンバーID'] === memberId;
  });
  if (alreadyIn) return { success: false, message: 'すでに出場登録されています' };

  appendRows_(ensureSheet_(ss, 'マッチメンバー'), [[matchId, memberId, team, 'はい']]);
  return { success: true, message: (member['名前'] || '助っ人') + 'が参戦！' };
}

/**
 * マッチから助っ人メンバーを削除する（助っ人='はい'の行のみ削除可能）
 * 通常出場メンバー（チーム分けで割当られた人）は削除できない。
 * イベントが「完了」の場合は削除不可。
 * @param {string} matchId - マッチID
 * @param {string} memberId - 削除するメンバーID
 * @return {Object} 結果オブジェクト { success, message }
 */
function removeSubstitute(matchId, memberId) {
  if (!matchId || !memberId) {
    return { success: false, message: '入力が不正です' };
  }

  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('マッチメンバー');
  if (!sheet || sheet.getLastRow() < 2) {
    return { success: false, message: 'マッチメンバーが見つかりません' };
  }

  // イベントステータスチェック
  var data = getMultipleSheetData_(['マッチ', 'ラウンド', 'イベント']);
  var match = data['マッチ'].find(function(m) { return m['マッチID'] === matchId; });
  if (!match) return { success: false, message: '試合が見つかりません' };
  var round = data['ラウンド'].find(function(r) { return r['ラウンドID'] === match['ラウンドID']; });
  var event = round ? data['イベント'].find(function(e) { return e['イベントID'] === round['イベントID']; }) : null;
  if (event && event['ステータス'] === '完了') {
    return { success: false, message: 'イベント完了後は助っ人を削除できません' };
  }

  // マッチメンバーシートから該当行を削除（助っ人='はい'の行のみ）
  var all = sheet.getDataRange().getValues();
  var headers = all[0];
  var colCount = headers.length;
  var remaining = [headers];
  var removed = false;

  for (var i = 1; i < all.length; i++) {
    var row = all[i];
    var isTarget = String(row[0]) === String(matchId) &&
                   String(row[1]) === String(memberId) &&
                   String(row[3]) === 'はい';
    if (isTarget && !removed) {
      removed = true;
      continue;
    }
    remaining.push(row);
  }

  if (!removed) {
    return { success: false, message: '助っ人として登録されていません' };
  }

  sheet.clearContents();
  sheet.getRange(1, 1, remaining.length, colCount).setValues(remaining);

  // 関連する得点も削除（助っ人が記録していた得点は消す）
  removeGoalsByMatchAndMember_(matchId, memberId);

  return { success: true, message: '助っ人を外しました' };
}

/**
 * 指定マッチから、指定メンバーの得点行を削除する
 * 助っ人解除時に、その助っ人が記録した「通常」得点を消すために使用する。
 * オウンゴール・不明（memberId='' の行）は対象外。
 * @param {string} matchId - マッチID
 * @param {string} memberId - メンバーID
 */
function removeGoalsByMatchAndMember_(matchId, memberId) {
  if (!memberId) return;
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('得点');
  if (!sheet || sheet.getLastRow() < 2) return;

  var all = sheet.getDataRange().getValues();
  var headers = all[0];
  var colCount = headers.length;
  var remaining = [headers];
  var changed = false;

  for (var i = 1; i < all.length; i++) {
    var row = all[i];
    // 列: 得点ID(0) / マッチID(1) / チーム(2) / メンバーID(3) / 種別(4)
    if (String(row[1]) === String(matchId) && String(row[3]) === String(memberId)) {
      changed = true;
      continue;
    }
    remaining.push(row);
  }

  if (!changed) return;
  sheet.clearContents();
  sheet.getRange(1, 1, remaining.length, colCount).setValues(remaining);
}
