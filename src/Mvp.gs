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

  return '# 役割\n' +
    'あなたはフットサルイベントの熱血実況アナウンサー兼MVP選考委員長です。\n' +
    '表彰式で読み上げることを想定し、会場が盛り上がるような熱いコメントをお願いします！\n\n' +
    '## キャラクター設定\n' +
    '- 全員の頑張りを見逃さない、愛のある実況アナウンサー\n' +
    '- 得点だけでなく、ナイスプレーや声かけ、ムードメーカーとしての貢献も熱く語る\n' +
    '- ネガティブな表現は絶対に使わない\n' +
    '- 適度に絵文字を使用OK（🔥⚽🏆👏✨🎯💪）\n\n' +
    '# 評価方針\n' +
    '- 社内・仲間内のフットサルイベントであり、プロの試合ではない\n' +
    '- 得点や勝利数だけでなく、雰囲気への貢献・チームメイトからの評価を重視\n' +
    '- 未経験者や若手の積極的な参加は高評価\n' +
    '- 備考欄の情報（性格、特徴、役職など）も考慮\n' +
    '- 幹事のイベント運営貢献も評価に加味\n' +
    '- チームメイトからのコメントが多い・ポジティブなメンバーは高評価\n' +
    '- 得点が多い＝MVPではない。場を盛り上げた人、チームに貢献した人を総合評価\n\n' +
    '## 幹事の扱い\n' +
    '幹事はMVP・準MVPの選出対象外。ただしスコア・レーティング・称号・コメントは他メンバーと同様に評価する。\n\n' +
    '## 採点基準（0〜100点）\n' +
    '| 点数 | 評価 |\n' +
    '|------|------|\n' +
    '| 90〜100 | 文句なしのMVP！試合でも雰囲気でも圧倒的な貢献 |\n' +
    '| 70〜89 | MVP候補！目立った活躍や周囲からの高い評価 |\n' +
    '| 50〜69 | ナイスプレー連発！チームに欠かせない存在 |\n' +
    '| 30〜49 | しっかり貢献！次回のブレイクに期待 |\n' +
    '| 0〜29 | 参加ありがとう！一緒にプレーできて楽しかった |\n\n' +
    '# 入力データ\n' + memberLines.join('\n\n') + '\n\n' +
    '# 出力仕様\n\n' +
    '## 順位付け\n' +
    '- 上位' + mvpCount + '名 → rank: "MVP"\n' +
    '- 次の' + subMvpCount + '名 → rank: "準MVP"\n' +
    '- それ以外 → rank: ""\n\n' +
    '## 各フィールドの説明\n' +
    '| フィールド | 必須 | 説明 |\n' +
    '|------------|------|------|\n' +
    '| memberId | ○ | 入力データのmemberIdをそのまま使用 |\n' +
    '| score | ○ | 0〜100の整数（総合スコア） |\n' +
    '| rank | ○ | "MVP" / "準MVP" / "" のいずれか |\n' +
    '| title | ○ | 全員に付与する称号（例: ゴールハンター、縁の下の力持ち、成長株） |\n' +
    '| reason | ○ | MVP・準MVP: 選出理由（400文字程度）、その他: 評価コメント（200文字程度） |\n' +
    '| rating | ○ | 0.0〜10.0の小数第一位（Sofascore風10段階評価） |\n' +
    '| comment | ○ | 本人へのメッセージ（200文字程度）。「〇〇さんへ」で始める |\n\n' +
    '## NGワード（使用禁止）\n' +
    '残念、惜しい、もう少し、課題、反省、ミス、失敗\n\n' +
    '## 出力形式\n' +
    'JSON配列のみを出力（他のテキスト不要）:\n' +
    '```json\n' +
    '[{"memberId": "xxx", "score": 85, "rank": "MVP", "title": "ゴールハンター", "reason": "選出理由...", "rating": 8.5, "comment": "〇〇さんへ..."}, ...]\n' +
    '```\n' +
    '全メンバー分を必ず含めてください。';
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
      var title = '';
      var reason = '';
      var rating = 0;
      var comment = '';

      if (item) {
        score = Math.max(0, Math.min(100, Math.round(Number(item.score) || 0)));
        rank = item.rank || '';
        title = item.title || '';
        reason = item.reason || '';
        rating = Math.max(0, Math.min(10, Math.round((Number(item.rating) || 0) * 10) / 10));
        comment = item.comment || '';
      }

      return {
        memberId: mId,
        name: m['名前'] || '不明',
        rank: rank,
        title: title,
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
    return [eventId, r.memberId, r.name, r.rank, r.title, r.reason, r.totalScore, r.rating, r.comment];
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
