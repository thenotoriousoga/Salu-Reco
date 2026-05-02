// ===================================
// MVP選出（Gemini AI 評価）
// ===================================

// -----------------------------------
// データ取得ヘルパー
// -----------------------------------

/**
 * MVP選出に必要なデータをまとめて取得する
 * @param {string} eventId - イベントID
 * @return {Object} MVP選出用データ一式
 *   - members: メンバー配列
 *   - memberMap: メンバーIDをキーにしたマップ
 *   - matchIds: 対象マッチIDの配列
 *   - matches: マッチデータ配列
 *   - matchMembers: マッチメンバーデータ配列
 *   - goals: 得点データ配列
 *   - surveyComments: アンケート回答データ配列
 */
function getMvpData_(eventId) {
  var members = getEventMembers(eventId);
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });
  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });
  var allMatches = getSheetData_('マッチ');
  var matches = allMatches.filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0; });
  var matchIds = matches.map(function(m) { return m['マッチID']; });

  var matchMembers = getSheetData_('マッチメンバー');
  var goals = getSheetData_('得点');
  var surveyComments = getSheetData_('アンケート回答').filter(function(c) { return c['イベントID'] === eventId; });

  return {
    members: members,
    memberMap: memberMap,
    matchIds: matchIds,
    matches: matches,
    matchMembers: matchMembers,
    goals: goals,
    surveyComments: surveyComments
  };
}

// -----------------------------------
// 参加メンバー抽出
// -----------------------------------

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

// -----------------------------------
// 定量評価（ルールベース）
// -----------------------------------

/**
 * メンバーの得点数を集計する
 * @param {Object[]} goals - 得点データ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @param {string} memberId - メンバーID
 * @return {number} 合計得点数
 */
function countGoals_(goals, matchIds, memberId) {
  return goals
    .filter(function(g) { return matchIds.indexOf(g['マッチID']) >= 0 && g['メンバーID'] === memberId; })
    .reduce(function(sum, g) { return sum + Number(g['得点数']); }, 0);
}

/**
 * メンバーの勝利数を集計する
 * @param {Object[]} matches - マッチデータ
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @param {string} memberId - メンバーID
 * @return {number} 勝利数
 */
function countWins_(matches, matchMembers, matchIds, memberId) {
  var wins = 0;
  matchIds.forEach(function(mMatchId) {
    var mm = matchMembers.find(function(mm) { return mm['マッチID'] === mMatchId && mm['メンバーID'] === memberId; });
    if (!mm) return;
    var match = matches.find(function(mt) { return mt['マッチID'] === mMatchId; });
    if (!match || match['ステータス'] !== '終了') return;
    var sA = Number(match['スコアA']);
    var sB = Number(match['スコアB']);
    if ((mm['チーム'] === 'A' && sA > sB) || (mm['チーム'] === 'B' && sB > sA)) {
      wins++;
    }
  });
  return wins;
}

/**
 * 経験・年次に基づくボーナス倍率を計算する
 * @param {Object} member - メンバーオブジェクト
 * @return {number} ボーナス倍率（1.0以上）
 */
function calcBonusMultiplier_(member) {
  var multiplier = 1.0;
  // 未経験者ボーナス
  if (member['サッカー経験'] === 'なし') {
    multiplier *= 1.3;
  }
  // 若手ボーナス
  var years = Number(member['年次']) || 1;
  if (years <= 2) {
    multiplier *= 1.15;
  }
  return multiplier;
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

    // 得点数 × 3pt
    score += countGoals_(goals, matchIds, mId) * 3;

    // 勝利数 × 2pt
    score += countWins_(matches, matchMembers, matchIds, mId) * 2;

    // 経験・年次ボーナス
    score *= calcBonusMultiplier_(m);

    quantScores[mId] = Math.round(score * 10) / 10;
  });
  return quantScores;
}

// -----------------------------------
// 定性評価（AI）
// -----------------------------------

/**
 * 定性評価用のプロンプトを組み立てる
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object[]} surveyComments - アンケート回答データ
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @return {string} プロンプト文字列
 */
function buildQualPrompt_(participantIds, surveyComments, memberMap) {
  var memberLines = participantIds.map(function(mId) {
    var m = memberMap[mId] || {};
    return '- memberId: "' + mId + '", 名前: ' + (m['名前'] || '不明') +
      ', サッカー経験: ' + (m['サッカー経験'] || '不明') +
      ', 年次: ' + (m['年次'] || '不明');
  });

  var commentLines = surveyComments.map(function(c) {
    var targetName = c['対象メンバー名'] || '不明';
    var targetId = c['対象メンバーID'] || '';
    var text = c['コメント'] || '';
    return '- 対象: ' + targetName + ' (memberId: "' + targetId + '"), コメント: 「' + text + '」';
  });

  return 'あなたはフットサルイベントの定性評価を行う審査員です。\n' +
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
}

/**
 * AIレスポンスから定性スコアをパースする
 * @param {string} responseText - AIレスポンスのJSON文字列
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @return {Object} メンバーIDをキーにした定性スコアのマップ、またはエラーオブジェクト
 */
function parseQualScores_(responseText, participantIds) {
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

  var prompt = buildQualPrompt_(participantIds, surveyComments, memberMap);
  var responseText = callGemini_(prompt);
  if (!responseText) {
    return { success: false, message: 'AI定性評価に失敗しました。GEMINI_API_KEY の設定とAPIの状態を確認してください。' };
  }

  return parseQualScores_(responseText, participantIds);
}

// -----------------------------------
// ランキング作成
// -----------------------------------

/**
 * 定量・定性スコアを正規化して合算し、ランキングを作成する
 * 定量50点 + 定性50点 = 100点満点
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} quantScores - メンバーIDをキーにした定量スコアのマップ
 * @param {Object} qualScores - メンバーIDをキーにした定性スコアのマップ
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @return {Object[]} 総合スコア降順のランキング配列
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

// -----------------------------------
// 順位付け
// -----------------------------------

/**
 * ランキング結果にMVP/準MVPの順位を付与する
 * @param {Object[]} totalScores - buildRanking_の戻り値
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {Object[]} rank付きの結果配列
 */
function assignRanks_(totalScores, mvpCount, subMvpCount) {
  return totalScores.map(function(s, i) {
    var rank = '';
    if (i < mvpCount) { rank = 'MVP'; }
    else if (i < mvpCount + subMvpCount) { rank = '準MVP'; }
    return { memberId: s.memberId, name: s.name, rank: rank, reason: '', quantScore: s.quantScore, qualScore: s.qualScore, totalScore: s.totalScore };
  });
}

// -----------------------------------
// 選出理由生成（AI）
// -----------------------------------

/**
 * 選出理由生成用のプロンプトを組み立てる
 * @param {Object[]} rankedResults - ランキング済みの結果配列（rank付き）
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @param {Object[]} surveyComments - アンケート回答データ
 * @param {Object[]} goals - 得点データ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @return {string} プロンプト文字列
 */
function buildReasonPrompt_(rankedResults, memberMap, surveyComments, goals, matchIds) {
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

  return 'あなたはフットサルイベントの評価コメントを作成するライターです。\n' +
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
}

/**
 * AIレスポンスから選出理由をパースする
 * @param {string} responseText - AIレスポンスのJSON文字列
 * @return {Object} メンバーIDをキーにした選出理由のマップ、またはエラーオブジェクト
 */
function parseReasons_(responseText) {
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

  var prompt = buildReasonPrompt_(rankedResults, memberMap, surveyComments, goals, matchIds);
  var responseText = callGemini_(prompt);
  if (!responseText) {
    return { success: false, message: 'AI評価コメントの生成に失敗しました。GEMINI_API_KEY の設定とAPIの状態を確認してください。' };
  }

  return parseReasons_(responseText);
}

// -----------------------------------
// 結果保存
// -----------------------------------

/**
 * MVP選出結果をスプレッドシートに保存する
 * 既存の結果を削除してから新しい結果を書き込む
 * @param {string} eventId - イベントID
 * @param {Object[]} results - 選出結果の配列
 */
function saveMvpResults_(eventId, results) {
  deleteRowsByMatch_('MVP結果', 0, eventId);
  var ss = getSpreadsheet_();
  var mvpSheet = ss.getSheetByName('MVP結果');
  results.forEach(function(r) {
    mvpSheet.appendRow([eventId, r.memberId, r.name, r.rank, r.reason, r.quantScore, r.qualScore, r.totalScore]);
  });
}

// -----------------------------------
// MVP選出メイン処理（公開関数）
// -----------------------------------

/**
 * MVP選出を実行する
 * 定量評価（ルールベース）50% + 定性評価（AI）50% の100点満点で評価
 * @param {string} eventId - イベントID
 * @return {Object} 選出結果 { success, results, message }
 */
function selectMVP(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var mvpCount = Number(event['MVP人数']) || 1;
  var subMvpCount = Number(event['準MVP人数']) || 1;

  // データ取得
  var data = getMvpData_(eventId);

  // 参加メンバー抽出
  var participantIds = getParticipantIds_(data.matchMembers, data.matchIds);
  if (participantIds.length === 0) {
    return { success: false, message: '参加メンバーがいません' };
  }

  // 定量スコア（ルールベース）
  var quantScores = calcQuantScores_(participantIds, data.memberMap, data.goals, data.matches, data.matchMembers, data.matchIds);

  // 定性スコア（AI評価）
  var qualScores = calcQualScoresAI_(participantIds, data.surveyComments, data.memberMap);
  if (qualScores.success === false) {
    return qualScores;
  }

  // ランキング作成
  var totalScores = buildRanking_(participantIds, quantScores, qualScores, data.memberMap);

  // 順位付け
  var results = assignRanks_(totalScores, mvpCount, subMvpCount);

  // 評価コメント生成（AI・全メンバー対象）
  var aiReasons = generateReasonsAI_(results, data.memberMap, data.surveyComments, data.goals, data.matchIds);
  if (aiReasons.success === false) {
    return aiReasons;
  }
  results.forEach(function(r) {
    r.reason = aiReasons[r.memberId] || '';
  });

  // 結果をスプレッドシートに保存
  saveMvpResults_(eventId, results);
  updateEventStatus(eventId, '完了');
  return { success: true, results: results, message: 'MVP選出が完了しました' };
}

/**
 * MVP選出結果を取得する
 * @param {string} eventId - イベントID
 * @return {Object[]} MVP結果データの配列
 */
function getMvpResults(eventId) {
  return getSheetData_('MVP結果').filter(function(r) { return r['イベントID'] === eventId; });
}
