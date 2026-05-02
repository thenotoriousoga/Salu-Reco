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
 * メンバー1人分のスコアを計算する（チーム分け用）
 * サッカー経験ありで2pt、年次（1〜10）を0.1〜1.0ptに正規化して加算
 * @param {Object} member - メンバーオブジェクト
 * @return {number} スコア
 */
function calcMemberScore_(member) {
  var expScore = (member['サッカー経験'] === 'あり') ? 2 : 0;
  var yearScore = Math.min(Number(member['年次']) || 1, 10) / 10;
  return expScore + yearScore;
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
    return { id: id, score: calcMemberScore_(m) };
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
 * メンバーデータを取得し、IDをキーにしたマップを返す
 * @return {Object} メンバーマップ
 */
function getMemberMap_() {
  var members = getSheetData_('メンバー');
  return buildMap_(members, 'メンバーID');
}

/**
 * 空のチーム配列を生成する
 * @param {number} teamCount - チーム数
 * @return {string[][]} 空配列の配列
 */
function createEmptyTeams_(teamCount) {
  var teams = [];
  for (var i = 0; i < teamCount; i++) { teams.push([]); }
  return teams;
}

/**
 * 既存チームのバランスを考慮して未割当メンバーを配置する（貪欲法）
 *
 * スコアの高いメンバーから順に、人数が少ない→スコアが低いチームに配置する。
 *
 * @param {string[]} memberIds - 未割当メンバーIDの配列
 * @param {string[][]} existingTeams - 既存のチーム配置
 * @param {Object} memberMap - メンバーマップ
 * @return {Object} { success, teams: string[][] } teamsは未割当メンバーのみのチーム別配列
 */
function assignToExistingTeams_(memberIds, existingTeams, memberMap) {
  var teamCount = existingTeams.length;

  // 各チームの現在のスコア合計を計算
  var teamScores = existingTeams.map(function(team) {
    var total = 0;
    team.forEach(function(id) {
      var m = memberMap[id] || {};
      total += calcMemberScore_(m);
    });
    return total;
  });

  // 各チームの現在の人数
  var teamSizes = existingTeams.map(function(team) { return team.length; });

  // 未割当メンバーをスコア降順でソート
  var scored = scoreMembersForSplit_(memberIds, memberMap);

  // 結果: 未割当メンバーのチーム別配列
  var result = createEmptyTeams_(teamCount);

  // 貪欲法: スコアの高いメンバーから順に、（人数が少ない → スコアが低い）チームに配置
  scored.forEach(function(p) {
    var bestIdx = 0;
    for (var i = 1; i < teamCount; i++) {
      if (teamSizes[i] < teamSizes[bestIdx]) {
        bestIdx = i;
      } else if (teamSizes[i] === teamSizes[bestIdx] && teamScores[i] < teamScores[bestIdx]) {
        bestIdx = i;
      }
    }
    result[bestIdx].push(p.id);
    teamScores[bestIdx] += p.score;
    teamSizes[bestIdx] += 1;
  });

  return { success: true, teams: result };
}

/**
 * 蛇行ドラフト方式でメンバーをチームに均等分配する
 *
 * スコア降順に並べたメンバーを、奇数ラウンドは左→右、偶数ラウンドは右→左の順で配置する。
 *
 * @param {string[]} memberIds - メンバーIDの配列
 * @param {number} teamCount - チーム数
 * @param {Object} memberMap - メンバーマップ
 * @return {Object} { success, teams: string[][] }
 */
function snakeDraftSplit_(memberIds, teamCount, memberMap) {
  var scored = scoreMembersForSplit_(memberIds, memberMap);
  var teams = createEmptyTeams_(teamCount);
  scored.forEach(function(p, i) {
    var round = Math.floor(i / teamCount);
    var pos = i % teamCount;
    var teamIdx = (round % 2 === 0) ? pos : (teamCount - 1 - pos);
    teams[teamIdx].push(p.id);
  });
  return { success: true, teams: teams };
}

/**
 * AI自動チーム分け（経験・年次考慮、Nチーム対応）
 *
 * existingTeams が渡された場合:
 *   既存チームのスコア・人数バランスを考慮し、memberIds（未割当）を貪欲法で配置する。
 *   返り値の teams は未割当メンバーのみのチーム別配列。
 *
 * existingTeams が渡されない場合:
 *   memberIds 全員を蛇行ドラフト方式でゼロから均等分配する。
 *
 * @param {string} eventId - イベントID
 * @param {string[]} memberIds - 配置対象のメンバーIDの配列
 * @param {number} [teamCount] - チーム数（省略時は2。existingTeams指定時はその長さを使用）
 * @param {string[][]} [existingTeams] - 既存のチーム配置（省略可）
 * @return {Object} { success, teams: string[][] }
 */
function autoSplitTeams(eventId, memberIds, teamCount, existingTeams) {
  teamCount = Number(teamCount) || 2;

  // existingTeams が渡された場合: 既存バランス考慮モード
  if (existingTeams && existingTeams.length >= 2) {
    teamCount = existingTeams.length;
    if (!memberIds || memberIds.length === 0) {
      return { success: false, message: '未割当のメンバーがいません' };
    }
    var memberMap = getMemberMap_();
    return assignToExistingTeams_(memberIds, existingTeams, memberMap);
  }

  // existingTeams なし: ゼロから蛇行ドラフト方式
  var error = validateSplitInput_(memberIds, teamCount);
  if (error) return error;

  var memberMap = getMemberMap_();
  return snakeDraftSplit_(memberIds, teamCount, memberMap);
}
