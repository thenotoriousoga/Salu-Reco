// ===================================
// MVP選出（Gemini AI 総合評価）
// 詳細は docs/mvp-logic.md を参照
// ===================================

// ===================================
// データ取得
// ===================================

/**
 * MVP選出に必要なデータをまとめて取得する
 * @param {string} eventId - イベントID
 * @return {Object} MVP選出用データ一式
 */
function getMvpData_(eventId) {
  // 複数シートを一括取得（個別取得より高速）
  var data = getMultipleSheetData_(['メンバー', 'ラウンド', 'マッチ', 'マッチメンバー', '得点', 'アンケート回答']);

  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });
  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });

  var allMatches = data['マッチ'];
  var matches = allMatches.filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0; });
  var matchIds = matches.map(function(m) { return m['マッチID']; });

  var matchMembers = data['マッチメンバー'];
  var goals = data['得点'];
  var surveyComments = data['アンケート回答'].filter(function(c) { return c['イベントID'] === eventId; });

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

// ===================================
// 参加メンバー抽出
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

// ===================================
// 試合データ集計（AI入力用）
// ===================================

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
 * メンバーの出場試合数を集計する
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @param {string} memberId - メンバーID
 * @return {number} 出場試合数
 */
function countPlayed_(matchMembers, matchIds, memberId) {
  return matchMembers.filter(function(mm) {
    return matchIds.indexOf(mm['マッチID']) >= 0 && mm['メンバーID'] === memberId;
  }).length;
}

// ===================================
// Gemini AI 総合評価
// ===================================

/**
 * AI総合評価用のプロンプトを組み立てる
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @param {Object[]} surveyComments - アンケート回答データ
 * @param {Object[]} goals - 得点データ
 * @param {Object[]} matches - マッチデータ
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {string} プロンプト文字列
 */
function buildMvpPrompt_(participantIds, memberMap, surveyComments, goals, matches, matchMembers, matchIds, mvpCount, subMvpCount) {
  var memberLines = participantIds.map(function(mId) {
    var m = memberMap[mId] || {};
    var totalGoals = countGoals_(goals, matchIds, mId);
    var totalWins = countWins_(matches, matchMembers, matchIds, mId);
    var played = countPlayed_(matchMembers, matchIds, mId);
    var comments = surveyComments
      .filter(function(c) { return c['対象メンバーID'] === mId; })
      .map(function(c) { return '「' + (c['コメント'] || '') + '」'; });

    return '- memberId: "' + mId + '"\n' +
      '  名前: ' + (m['名前'] || '不明') + '\n' +
      '  サッカー経験: ' + (m['サッカー経験'] || '不明') + '\n' +
      '  年次: ' + (m['年次'] || '不明') + '\n' +
      '  備考: ' + (m['備考'] || 'なし') + '\n' +
      '  幹事: ' + (m['幹事'] || 'いいえ') + '\n' +
      '  出場試合数: ' + played + '\n' +
      '  得点数: ' + totalGoals + '\n' +
      '  勝利数: ' + totalWins + '\n' +
      '  チームメイトからのコメント: ' + (comments.length > 0 ? comments.join(', ') : 'なし');
  });

  return 'あなたはフットサルイベントのMVP選出を行う審査員です。\n' +
    '以下のメンバー情報・試合データ・アンケートコメントを総合的に判断し、各メンバーを0〜100点で採点してください。\n\n' +
    '【重要な評価方針】\n' +
    '- これは社内・仲間内のフットサルイベントです。プロの試合ではありません\n' +
    '- 得点や勝利数だけでなく、現場の雰囲気への貢献・チームメイトからの評価を重視してください\n' +
    '- サッカー未経験者や若手が積極的に参加し頑張っている場合は、高く評価してください\n' +
    '- 備考欄の情報（メンバーの性格、特徴、役職など）も考慮してください\n' +
    '- 幹事としてイベント運営に貢献しているメンバーも評価に加味してください\n' +
    '- チームメイトからのコメントが多い・ポジティブなメンバーは高く評価してください\n' +
    '- 得点が多い＝MVPではありません。場を盛り上げた人、チームに貢献した人を総合的に評価してください\n\n' +
    '- 幹事はMVP、準MVPから除外してください。スコア、レーティングは他のメンバーと同様に評価してください\n\n' +
    '【採点基準の目安】\n' +
    '- 90〜100点: 文句なしのMVP。試合でも雰囲気でも圧倒的な貢献\n' +
    '- 70〜89点: MVP候補。目立った活躍や周囲からの高い評価\n' +
    '- 50〜69点: 良い活躍。チームに貢献していた\n' +
    '- 30〜49点: 普通の参加。特筆すべき点は少ない\n' +
    '- 0〜29点: 参加のみ。目立った活躍やコメントがない\n\n' +
    '【メンバー情報・試合データ・コメント】\n' + memberLines.join('\n\n') + '\n\n' +
    '【出力ルール】\n' +
    '- 上位' + mvpCount + '名を「MVP」、次の' + subMvpCount + '名を「準MVP」としてください\n' +
    '- 全メンバーに評価コメント（50〜80文字程度）を付けてください\n' +
    '- MVP・準MVPのメンバーには選出理由を、それ以外のメンバーにはポジティブな評価コメントを書いてください\n' +
    '- 堅すぎず、フットサルの楽しい雰囲気に合ったトーンで書いてください\n\n' +
    '以下のJSON配列形式で返してください（他のテキストは不要）:\n' +
    '[{"memberId": "xxx", "score": 85, "rank": "MVP", "reason": "評価コメント", "rating": 7.5, "comment": "個人評価コメント"}, ...]\n' +
    'rankは "MVP", "準MVP", "" のいずれかです。全メンバー分を必ず含めてください。\n' +
    'ratingは0.0〜10.0の小数第一位までの数値です（Sofascore風の10段階評価）。\n' +
    'commentは全メンバーに対する個人評価コメント（50〜80文字程度）です。reasonとは別に、その人のプレー全体を評価するコメントを書いてください。';
}

/**
 * AIレスポンスをパースしてMVP結果を構築する
 * @param {string} responseText - AIレスポンスのJSON文字列
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @return {Object[]|Object} 結果配列、またはエラーオブジェクト
 */
function parseMvpResponse_(responseText, participantIds, memberMap) {
  try {
    var parsed = JSON.parse(responseText);
    var results = participantIds.map(function(mId) {
      var m = memberMap[mId] || {};
      var item = parsed.find(function(p) { return p.memberId === mId; });

      var score = 0;
      var rank = '';
      var reason = '';
      var rating = 0;
      var comment = '';

      if (item) {
        score = Math.max(0, Math.min(100, Math.round(Number(item.score) || 0)));
        rank = item.rank || '';
        reason = item.reason || '';
        rating = Math.max(0, Math.min(10, Math.round((Number(item.rating) || 0) * 10) / 10));
        comment = item.comment || '';
      }

      return {
        memberId: mId,
        name: m['名前'] || '不明',
        rank: rank,
        reason: reason,
        totalScore: score,
        rating: rating,
        comment: comment
      };
    });

    // スコア降順でソート
    results.sort(function(a, b) { return b.totalScore - a.totalScore; });
    return results;
  } catch (e) {
    return { success: false, message: 'AI評価のレスポンス解析に失敗しました: ' + e.message };
  }
}

// ===================================
// 結果保存
// ===================================

/**
 * MVP選出結果をスプレッドシートに保存する
 * 既存の結果を削除してから新しい結果を書き込む
 * @param {string} eventId - イベントID
 * @param {Object[]} results - 選出結果の配列
 */
function saveMvpResults_(eventId, results) {
  deleteRowsByMatch_('MVP結果', 0, eventId);

  if (!results || results.length === 0) return;

  // 行配列に変換して一括書き込み（appendRowの繰り返しより高速）
  var rows = results.map(function(r) {
    return [eventId, r.memberId, r.name, r.rank, r.reason, r.totalScore, r.rating, r.comment];
  });

  var ss = getSpreadsheet_();
  var mvpSheet = ss.getSheetByName('MVP結果');
  var lastRow = mvpSheet.getLastRow();
  mvpSheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ===================================
// 公開関数
// ===================================

/**
 * MVP選出を実行する
 * 全データをGemini AIに渡し、総合的に0〜100点で評価する
 * イベントが「試合終了」状態の場合のみ実行可能
 * @param {string} eventId - イベントID
 * @return {Object} 選出結果 { success, results, message }
 */
function selectMVP(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  // ステータスチェック
  var status = event['ステータス'];
  if (status !== '試合終了') {
    return { success: false, message: 'MVP選出は試合終了後のみ可能です' };
  }

  var mvpCount = Number(event['MVP人数']) || 1;
  var subMvpCount = Number(event['準MVP人数']) || 1;

  // アンケート回答を自動取得（フォームが作成済みの場合）
  if (event['フォームID']) {
    fetchSurveyResponses(eventId);
  }

  // データ取得
  var data = getMvpData_(eventId);

  // 参加メンバー抽出
  var participantIds = getParticipantIds_(data.matchMembers, data.matchIds);
  if (participantIds.length === 0) {
    return { success: false, message: '参加メンバーがいません' };
  }

  // Gemini AI 総合評価
  var prompt = buildMvpPrompt_(
    participantIds, data.memberMap, data.surveyComments,
    data.goals, data.matches, data.matchMembers, data.matchIds,
    mvpCount, subMvpCount
  );
  var responseText = callGemini_(prompt);
  if (!responseText) {
    return { success: false, message: 'AI評価に失敗しました。GEMINI_API_KEY の設定とAPIの状態を確認してください。' };
  }

  // レスポンス解析
  var results = parseMvpResponse_(responseText, participantIds, data.memberMap);
  if (results.success === false) {
    return results;
  }

  // 結果をスプレッドシートに保存
  saveMvpResults_(eventId, results);

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
