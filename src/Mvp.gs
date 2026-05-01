// ===================================
// MVP選出（Gemini AI 評価）
// ===================================

/**
 * マッチに出場した参加メンバーIDの一覧を取得する（重複なし）
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @return {string[]} 参加メンバーIDの配列
 */
function getParticipantIds_(matchMembers, matchIds) {
  var participantIds = [];
  var seen = {};
  matchMembers.forEach(function(mm) {
    if (matchIds.indexOf(mm['マッチID']) >= 0 && !seen[mm['メンバーID']]) {
      participantIds.push(mm['メンバーID']);
      seen[mm['メンバーID']] = true;
    }
  });
  return participantIds;
}

/**
 * 各メンバーの定量スコアを計算する
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @param {Object[]} goals - 得点データ
 * @param {Object[]} matches - マッチデータ
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @return {Object} メンバーIDをキーにした定量スコアのマップ
 */
function calcQuantScores_(participantIds, memberMap, goals, matches, matchMembers, matchIds) {
  var quantScores = {};
  participantIds.forEach(function(mId) {
    var m = memberMap[mId] || {};
    var score = 0;

    // 得点数
    var totalGoals = goals
      .filter(function(g) { return matchIds.indexOf(g['マッチID']) >= 0 && g['メンバーID'] === mId; })
      .reduce(function(sum, g) { return sum + Number(g['得点数']); }, 0);
    score += totalGoals * 3;

    // 勝利数
    matchIds.forEach(function(mMatchId) {
      var mm = matchMembers.find(function(mm) { return mm['マッチID'] === mMatchId && mm['メンバーID'] === mId; });
      if (!mm) return;
      var match = matches.find(function(mt) { return mt['マッチID'] === mMatchId; });
      if (!match || match['ステータス'] !== '終了') return;
      var sA = Number(match['スコアA']);
      var sB = Number(match['スコアB']);
      if ((mm['チーム'] === 'A' && sA > sB) || (mm['チーム'] === 'B' && sB > sA)) {
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

// ===================================
// 定性評価（AI）
// ===================================

/**
 * Gemini AI を使って各メンバーの定性スコアを算出する
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object[]} surveyComments - アンケート回答データ
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @return {Object} メンバーIDをキーにした定性スコアのマップ
 */
function calcQualScoresAI_(participantIds, surveyComments, memberMap) {
  // コメントが無い場合は全員0点
  if (surveyComments.length === 0) {
    var qualScores = {};
    participantIds.forEach(function(mId) { qualScores[mId] = 0; });
    return qualScores;
  }

  // プロンプト用のメンバー情報を組み立て
  var memberLines = participantIds.map(function(mId) {
    var m = memberMap[mId] || {};
    return '- memberId: "' + mId + '", 名前: ' + (m['名前'] || '不明') +
      ', サッカー経験: ' + (m['サッカー経験'] || '不明') +
      ', 年次: ' + (m['年次'] || '不明');
  });

  // コメント情報を組み立て
  var commentLines = surveyComments.map(function(c) {
    var targetName = c['対象メンバー名'] || '不明';
    var targetId = c['対象メンバーID'] || '';
    var text = c['コメント'] || '';
    return '- 対象: ' + targetName + ' (memberId: "' + targetId + '"), コメント: 「' + text + '」';
  });

  var prompt = 'あなたはフットサルイベントの定性評価を行う審査員です。\n' +
    'アンケートのコメントを分析し、各メンバーの定性スコアを0〜50の整数で採点してください。\n\n' +
    '【評価基準】\n' +
    '- チームメイトからの評価の高さ（コメント数、内容のポジティブさ）\n' +
    '- プレーの質に関する言及（シュート、パス、ディフェンスなど）\n' +
    '- チームへの貢献度（盛り上げ、声かけ、サポートなど）\n' +
    '- コメントが無いメンバーは0点としてください\n' +
    '- サッカー未経験者が頑張っている場合は加点を考慮してください\n\n' +
    '【メンバー一覧】\n' + memberLines.join('\n') + '\n\n' +
    '【アンケートコメント】\n' + commentLines.join('\n') + '\n\n' +
    '以下のJSON配列形式で返してください（他のテキストは不要）:\n' +
    '[{"memberId": "xxx", "score": 30}, ...]\n' +
    '全メンバー分を必ず含めてください。';

  var responseText = callGemini_(prompt);
  if (!responseText) {
    return { success: false, message: 'AI定性評価に失敗しました。GEMINI_API_KEY の設定とAPIの状態を確認してください。' };
  }

  // JSONパース
  try {
    var parsed = JSON.parse(responseText);
    var qualScores = {};
    // まず全員0で初期化
    participantIds.forEach(function(mId) { qualScores[mId] = 0; });
    // AIの結果を反映
    parsed.forEach(function(item) {
      if (item.memberId && typeof item.score === 'number') {
        var s = Math.max(0, Math.min(50, Math.round(item.score)));
        qualScores[item.memberId] = s;
      }
    });
    return qualScores;
  } catch (e) {
    return { success: false, message: 'AI定性評価のレスポンス解析に失敗しました: ' + e.message };
  }
}

// ===================================
// ランキング作成
// ===================================

/**
 * ランキングを作成する
 */
function buildRanking_(participantIds, quantScores, qualScores, memberMap) {
  var maxQuant = Math.max.apply(null, participantIds.map(function(id) { return quantScores[id] || 0; }).concat([1]));
  var maxQual = Math.max.apply(null, participantIds.map(function(id) { return qualScores[id] || 0; }).concat([1]));
  var totalScores = participantIds.map(function(mId) {
    var normQuant = ((quantScores[mId] || 0) / maxQuant) * 50;
    var normQual = ((qualScores[mId] || 0) / maxQual) * 50;
    var total = Math.round((normQuant + normQual) * 10) / 10;
    return { memberId: mId, name: (memberMap[mId] || {})['名前'] || '不明', quantScore: quantScores[mId] || 0, qualScore: qualScores[mId] || 0, totalScore: total };
  });
  totalScores.sort(function(a, b) { return b.totalScore - a.totalScore; });
  return totalScores;
}

// ===================================
// 選出理由生成（AI）
// ===================================

/**
 * Gemini AI を使って全メンバーの評価コメントを生成する
 * MVP/準MVPには選出理由、それ以外のメンバーには評価コメントを作成する
 * @param {Object[]} rankedResults - ランキング済みの結果配列（rank付き）
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @param {Object[]} surveyComments - アンケート回答データ
 * @param {Object[]} goals - 得点データ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @return {Object} メンバーIDをキーにした評価コメントのマップ
 */
function generateReasonsAI_(rankedResults, memberMap, surveyComments, goals, matchIds) {
  if (rankedResults.length === 0) return {};

  // 各メンバーの情報を組み立て
  var targetLines = rankedResults.map(function(r) {
    var m = memberMap[r.memberId] || {};
    var totalGoals = goals
      .filter(function(g) { return matchIds.indexOf(g['マッチID']) >= 0 && g['メンバーID'] === r.memberId; })
      .reduce(function(sum, g) { return sum + Number(g['得点数']); }, 0);
    var comments = surveyComments
      .filter(function(c) { return c['対象メンバーID'] === r.memberId; })
      .map(function(c) { return c['コメント'] || ''; });

    return '- memberId: "' + r.memberId + '"\n' +
      '  名前: ' + r.name + '\n' +
      '  順位: ' + (r.rank || 'なし') + '\n' +
      '  サッカー経験: ' + (m['サッカー経験'] || '不明') + '\n' +
      '  年次: ' + (m['年次'] || '不明') + '\n' +
      '  得点数: ' + totalGoals + '\n' +
      '  定量スコア: ' + r.quantScore + 'pt\n' +
      '  定性スコア: ' + r.qualScore + 'pt\n' +
      '  総合スコア: ' + r.totalScore + '/100\n' +
      '  チームメイトからのコメント: ' + (comments.length > 0 ? comments.map(function(c) { return '「' + c + '」'; }).join(', ') : 'なし');
  });

  var prompt = 'あなたはフットサルイベントの評価コメントを作成するライターです。\n' +
    '以下の全メンバーについて、定量データ（得点・勝利）とチームメイトからのコメントを踏まえた評価コメントを作成してください。\n\n' +
    '【ルール】\n' +
    '- 1人あたり50〜80文字程度の自然な日本語で書いてください\n' +
    '- 「MVP選出理由: 」などのプレフィックスは不要です\n' +
    '- 得点やコメント内容など具体的な事実を盛り込んでください\n' +
    '- サッカー未経験者の場合はその頑張りに触れてください\n' +
    '- 堅すぎず、フットサルの楽しい雰囲気に合ったトーンで書いてください\n' +
    '- 順位が「MVP」「準MVP」のメンバーは選出理由として書いてください\n' +
    '- 順位が「なし」のメンバーも、良かった点や印象に残ったプレーなどポジティブな評価コメントを書いてください\n\n' +
    '【メンバー一覧】\n' + targetLines.join('\n\n') + '\n\n' +
    '以下のJSON配列形式で返してください（他のテキストは不要）:\n' +
    '[{"memberId": "xxx", "reason": "評価コメント"}, ...]\n' +
    '全メンバー分を必ず含めてください。';

  var responseText = callGemini_(prompt);
  if (!responseText) {
    return { success: false, message: 'AI評価コメントの生成に失敗しました。GEMINI_API_KEY の設定とAPIの状態を確認してください。' };
  }

  try {
    var parsed = JSON.parse(responseText);
    var reasons = {};
    parsed.forEach(function(item) {
      if (item.memberId && item.reason) {
        reasons[item.memberId] = item.reason;
      }
    });
    return reasons;
  } catch (e) {
    return { success: false, message: 'AI評価コメントのレスポンス解析に失敗しました: ' + e.message };
  }
}

// ===================================
// MVP選出メイン処理
// ===================================

function selectMVP(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var mvpCount = Number(event['MVP人数']) || 1;
  var subMvpCount = Number(event['準MVP人数']) || 1;

  var members = getEventMembers(eventId);
  var memberMap = buildMap_(members, 'メンバーID');

  // ラウンド → マッチIDを収集
  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });
  var allMatches = getSheetData_('マッチ');
  var matches = allMatches.filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0; });
  var matchIds = matches.map(function(m) { return m['マッチID']; });

  var matchMembers = getSheetData_('マッチメンバー');
  var goals = getSheetData_('得点');
  var surveyComments = getSheetData_('アンケート回答').filter(function(c) { return c['イベントID'] === eventId; });

  var participantIds = getParticipantIds_(matchMembers, matchIds);
  if (participantIds.length === 0) {
    return { success: false, message: '参加メンバーがいません' };
  }

  // 定量スコア（ルールベース）
  var quantScores = calcQuantScores_(participantIds, memberMap, goals, matches, matchMembers, matchIds);

  // 定性スコア（AI評価）
  var qualScores = calcQualScoresAI_(participantIds, surveyComments, memberMap);
  if (qualScores.success === false) {
    return qualScores;
  }

  // ランキング作成
  var totalScores = buildRanking_(participantIds, quantScores, qualScores, memberMap);

  // 順位付け
  var results = totalScores.map(function(s, i) {
    var rank = '';
    if (i < mvpCount) { rank = 'MVP'; }
    else if (i < mvpCount + subMvpCount) { rank = '準MVP'; }
    return { memberId: s.memberId, name: s.name, rank: rank, reason: '', quantScore: s.quantScore, qualScore: s.qualScore, totalScore: s.totalScore };
  });

  // 評価コメント生成（AI・全メンバー対象）
  var aiReasons = generateReasonsAI_(results, memberMap, surveyComments, goals, matchIds);
  if (aiReasons.success === false) {
    return aiReasons;
  }
  results.forEach(function(r) {
    r.reason = aiReasons[r.memberId] || '';
  });

  // 結果をスプレッドシートに保存
  deleteRowsByMatch_('MVP結果', 0, eventId);
  var ss = getSpreadsheet_();
  var mvpSheet = ss.getSheetByName('MVP結果');
  results.forEach(function(r) {
    mvpSheet.appendRow([eventId, r.memberId, r.name, r.rank, r.reason, r.quantScore, r.qualScore, r.totalScore]);
  });
  updateEventStatus(eventId, '完了');
  return { success: true, results: results, message: 'MVP選出が完了しました' };
}

function getMvpResults(eventId) {
  return getSheetData_('MVP結果').filter(function(r) { return r['イベントID'] === eventId; });
}
