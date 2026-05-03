// ===================================
// チーム分けロジック
// 経験者・未経験者をそれぞれシャッフルして均等配分
// ===================================

/**
 * 配列をシャッフルする（Fisher-Yates）
 * @param {Array} arr - 対象配列（破壊的に変更）
 * @return {Array} シャッフル済み配列
 */
function shuffle_(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * メンバーIDの配列をNチームに均等配分する（ラウンドロビン）
 * @param {string[]} ids - メンバーIDの配列
 * @param {string[][]} teams - 配置先のチーム配列（破壊的に追加）
 */
function distributeToTeams_(ids, teams) {
  ids.forEach(function(id, i) {
    teams[i % teams.length].push(id);
  });
}

/**
 * チーム分けの入力バリデーション
 * @param {string[]} memberIds - メンバーIDの配列
 * @param {number} teamCount - チーム数
 * @return {Object|null} エラーがあれば { success: false, message } を返す
 */
function validateSplitInput_(memberIds, teamCount) {
  if (!memberIds || memberIds.length < 4) {
    return { success: false, message: '4人以上のメンバーを選択してください' };
  }
  var maxT = Math.max(2, Math.floor(memberIds.length / 3));
  if (teamCount > maxT) {
    return { success: false, message: memberIds.length + '人では最大' + maxT + 'チームです（1チーム最低3人）' };
  }
  return null;
}

/**
 * 自動チーム分け（経験者・未経験者を均等配分）
 *
 * 経験者と未経験者をそれぞれシャッフルし、ラウンドロビンでNチームに配分する。
 * existingTeams が渡された場合は、既存チームに未割当メンバーを追加配分する。
 *
 * @param {string} eventId - イベントID
 * @param {string[]} memberIds - 配置対象のメンバーIDの配列
 * @param {number} [teamCount] - チーム数（省略時は2）
 * @param {string[][]} [existingTeams] - 既存のチーム配置（省略可）
 * @return {Object} { success, teams: string[][] }
 */
function autoSplitTeams(eventId, memberIds, teamCount, existingTeams) {
  teamCount = Number(teamCount) || 2;

  // 既存チーム考慮モード
  if (existingTeams && existingTeams.length >= 2) {
    teamCount = existingTeams.length;
    if (!memberIds || memberIds.length === 0) {
      return { success: false, message: '未割当のメンバーがいません' };
    }
  }

  var error = validateSplitInput_(memberIds, teamCount);
  if (error) return error;

  var memberMap = buildMap_(getSheetData_('メンバー'), 'メンバーID');

  // 経験者と未経験者に分けてシャッフル
  var experienced = [];
  var inexperienced = [];
  memberIds.forEach(function(id) {
    var m = memberMap[id] || {};
    if (m['サッカー経験'] === 'あり') { experienced.push(id); }
    else { inexperienced.push(id); }
  });
  shuffle_(experienced);
  shuffle_(inexperienced);

  // チーム配列を用意
  var teams = [];
  for (var i = 0; i < teamCount; i++) teams.push([]);

  // 経験者→未経験者の順にラウンドロビンで配分
  distributeToTeams_(experienced, teams);
  distributeToTeams_(inexperienced, teams);

  return { success: true, teams: teams };
}
