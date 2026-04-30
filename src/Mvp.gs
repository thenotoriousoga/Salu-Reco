// ===================================
// MVP選出（AI評価）
// ===================================

/**
 * 定性評価で使用するポジティブワードリスト
 */
var POSITIVE_WORDS_ = [
  'すごい', 'うまい', '上手', 'ナイス', 'いい', '良い', 'よかった',
  '活躍', 'MVP', '最高', 'かっこいい', '頑張', 'がんば',
  'アシスト', 'セーブ', 'ディフェンス', '守備', '攻撃',
  '盛り上', '楽し', 'ありがとう', '感謝', '助か',
  'パス', 'シュート', 'ドリブル', '走', '速'
];

/**
 * ラウンドに出場した参加メンバーIDの一覧を取得する（重複なし）
 * @param {Object[]} roundMembers - ラウンドメンバーデータ
 * @param {string[]} roundIds - 対象ラウンドIDの配列
 * @return {string[]} 参加メンバーIDの配列
 */
function getParticipantIds_(roundMembers, roundIds) {
  var participantIds = [];
  var seen = {};
  roundMembers.forEach(function(rm) {
    if (roundIds.indexOf(rm['ラウンドID']) >= 0 && !seen[rm['メンバーID']]) {
      participantIds.push(rm['メンバーID']);
      seen[rm['メンバーID']] = true;
    }
  });
  return participantIds;
}

/**
 * 各メンバーの定量スコアを計算する
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @param {Object[]} goals - 得点データ
 * @param {Object[]} rounds - ラウンドデータ
 * @param {Object[]} roundMembers - ラウンドメンバーデータ
 * @param {string[]} roundIds - 対象ラウンドIDの配列
 * @return {Object} メンバーIDをキーにした定量スコアのマップ
 */
function calcQuantScores_(participantIds, memberMap, goals, rounds, roundMembers, roundIds) {
  var quantScores = {};
  participantIds.forEach(function(mId) {
    var m = memberMap[mId] || {};
    var score = 0;

    // 得点数
    var totalGoals = goals
      .filter(function(g) { return roundIds.indexOf(g['ラウンドID']) >= 0 && g['メンバーID'] === mId; })
      .reduce(function(sum, g) { return sum + Number(g['得点数']); }, 0);
    score += totalGoals * 3;

    // 勝利数
    roundIds.forEach(function(rId) {
      var rm = roundMembers.find(function(rm) { return rm['ラウンドID'] === rId && rm['メンバーID'] === mId; });
      if (!rm) return;
      var round = rounds.find(function(r) { return r['ラウンドID'] === rId; });
      if (!round || round['ステータス'] !== '終了') return;
      var sA = Number(round['スコアA']);
      var sB = Number(round['スコアB']);
      if ((rm['チーム'] === 'A' && sA > sB) || (rm['チーム'] === 'B' && sB > sA)) {
        score += 2;
      }
    });

    // 未経験者ボーナス
    if (m['サッカー経験'] === 'なし') {
      score *= 1.3;
    }

    // 若手ボーナス
    var years = Number(m['年次']) || 1;
    if (years <= 2) {
      score *= 1.15;
    }

    quantScores[mId] = Math.round(score * 10) / 10;
  });
  return quantScores;
}

/**
 * 各メンバーの定性スコアを計算する
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object[]} surveyComments - アンケート回答データ（イベントでフィルタ済み）
 * @return {Object} メンバーIDをキーにした定性スコアのマップ
 */
function calcQualScores_(participantIds, surveyComments) {
  var qualScores = {};
  participantIds.forEach(function(mId) {
    var comments = surveyComments.filter(function(c) { return c['対象メンバーID'] === mId; });
    var score = comments.length * 2;

    comments.forEach(function(c) {
      var text = c['コメント'] || '';
      POSITIVE_WORDS_.forEach(function(word) {
        if (text.indexOf(word) >= 0) score += 1;
      });
      if (text.length > 30) score += 1;
      if (text.length > 60) score += 1;
    });

    qualScores[mId] = score;
  });
  return qualScores;
}

/**
 * 定量・定性スコアを正規化して総合スコアを算出し、ランキングを作成する
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} quantScores - 定量スコアマップ
 * @param {Object} qualScores - 定性スコアマップ
 * @param {Object} memberMap - メンバーマップ
 * @return {Object[]} 総合スコア降順のランキング配列
 */
function buildRanking_(participantIds, quantScores, qualScores, memberMap) {
  var maxQuant = Math.max.apply(null, participantIds.map(function(id) { return quantScores[id] || 0; }).concat([1]));
  var maxQual = Math.max.apply(null, participantIds.map(function(id) { return qualScores[id] || 0; }).concat([1]));

  var totalScores = participantIds.map(function(mId) {
    var normQuant = ((quantScores[mId] || 0) / maxQuant) * 50;
    var normQual = ((qualScores[mId] || 0) / maxQual) * 50;
    var total = Math.round((normQuant + normQual) * 10) / 10;
    return {
      memberId: mId,
      name: (memberMap[mId] || {})['名前'] || '不明',
      quantScore: quantScores[mId] || 0,
      qualScore: qualScores[mId] || 0,
      totalScore: total
    };
  });

  totalScores.sort(function(a, b) { return b.totalScore - a.totalScore; });
  return totalScores;
}

function selectMVP(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var mvpCount = Number(event['MVP人数']) || 1;
  var subMvpCount = Number(event['準MVP人数']) || 1;

  // データ収集
  var members = getEventMembers(eventId);
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });
  var roundMembers = getSheetData_('ラウンドメンバー');
  var goals = getSheetData_('得点');
  var surveyComments = getSheetData_('アンケート回答').filter(function(c) { return c['イベントID'] === eventId; });

  // 参加メンバーID（ラウンドに出場した人）
  var participantIds = getParticipantIds_(roundMembers, roundIds);

  if (participantIds.length === 0) {
    return { success: false, message: '参加メンバーがいません' };
  }

  // スコア計算
  var quantScores = calcQuantScores_(participantIds, memberMap, goals, rounds, roundMembers, roundIds);
  var qualScores = calcQualScores_(participantIds, surveyComments);

  // ランキング作成
  var totalScores = buildRanking_(participantIds, quantScores, qualScores, memberMap);

  // 順位付け・理由生成
  var results = totalScores.map(function(s, i) {
    var rank = '';
    var reason = '';
    if (i < mvpCount) {
      rank = 'MVP';
      reason = buildReason_(s, memberMap[s.memberId], true);
    } else if (i < mvpCount + subMvpCount) {
      rank = '準MVP';
      reason = buildReason_(s, memberMap[s.memberId], false);
    }
    return {
      memberId: s.memberId,
      name: s.name,
      rank: rank,
      reason: reason,
      quantScore: s.quantScore,
      qualScore: s.qualScore,
      totalScore: s.totalScore
    };
  });

  // 結果保存
  deleteRowsByMatch_('MVP結果', 0, eventId);
  var ss = getSpreadsheet_();
  var mvpSheet = ss.getSheetByName('MVP結果');
  results.forEach(function(r) {
    mvpSheet.appendRow([eventId, r.memberId, r.name, r.rank, r.reason, r.quantScore, r.qualScore, r.totalScore]);
  });

  updateEventStatus(eventId, '完了');

  return { success: true, results: results, message: 'MVP選出が完了しました' };
}

function buildReason_(scoreData, memberData, isMvp) {
  var parts = [];
  var m = memberData || {};

  if (scoreData.quantScore > 0) {
    parts.push('定量評価 ' + scoreData.quantScore + 'pt');
  }
  if (m['サッカー経験'] === 'なし' && scoreData.quantScore > 0) {
    parts.push('サッカー未経験ながら素晴らしい活躍');
  }
  if (scoreData.qualScore > 0) {
    parts.push('チームメイトからの高い評価（定性 ' + scoreData.qualScore + 'pt）');
  }
  if (parts.length === 0) {
    parts.push('総合的な貢献');
  }

  var prefix = isMvp ? 'MVP選出理由: ' : '準MVP選出理由: ';
  return prefix + parts.join('、');
}

function getMvpResults(eventId) {
  return getSheetData_('MVP結果').filter(function(r) { return r['イベントID'] === eventId; });
}
