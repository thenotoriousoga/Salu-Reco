// ===================================
// チーム分けロジック
// AI自動分け（経験・年次考慮）/ ランダム分け
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
 * チーム分けの入力バリデーション
 * @param {string[]} memberIds - メンバーIDの配列
 * @param {number} teamCount - チーム数
 * @return {Object|null} エラーがあれば { success: false, message } を返す。問題なければ null
 */
function validateSplitInput_(memberIds, teamCount) {
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
  return null;
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
  var error = validateSplitInput_(memberIds, teamCount);
  if (error) return error;

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
  var error = validateSplitInput_(memberIds, teamCount);
  if (error) return error;

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
