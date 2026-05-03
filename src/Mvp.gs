// ===================================
// MVP選出（Gemini AI 総合評価）
// 詳細は docs/mvp-logic.md を参照
// ===================================

// ===================================
// データ取得・集計
// ===================================

/**
 * MVP選出に必要なデータをまとめて取得する
 * @param {string} eventId - イベントID
 * @return {Object} MVP選出用データ一式
 */
function getMvpData_(eventId) {
  var data = getMultipleSheetData_(['メンバー', 'ラウンド', 'マッチ', 'マッチメンバー', '得点', 'アンケート回答']);

  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });
  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });

  var matches = data['マッチ'].filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0; });
  var matchIds = matches.map(function(m) { return m['マッチID']; });

  return {
    members: members,
    memberMap: memberMap,
    matchIds: matchIds,
    matches: matches,
    matchMembers: data['マッチメンバー'],
    goals: data['得点'],
    surveyComments: data['アンケート回答'].filter(function(c) { return c['イベントID'] === eventId; })
  };
}

/**
 * マッチに出場した参加メンバーIDの一覧を取得する（重複なし）
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @return {string[]} 参加メンバーIDの配列
 */
function getParticipantIds_(matchMembers, matchIds) {
  var seen = {};
  var result = [];
  matchMembers.forEach(function(mm) {
    if (matchIds.indexOf(mm['マッチID']) >= 0 && !seen[mm['メンバーID']]) {
      result.push(mm['メンバーID']);
      seen[mm['メンバーID']] = true;
    }
  });
  return result;
}

/**
 * メンバーの試合統計を1パスで集計する
 * @param {Object[]} matches - マッチデータ
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {Object[]} goals - 得点データ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @param {string} memberId - メンバーID
 * @return {Object} { goals: number, wins: number, played: number }
 */
function calcMemberStats_(matches, matchMembers, goals, matchIds, memberId) {
  var stats = { goals: 0, wins: 0, played: 0 };

  // 得点集計
  goals.forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) >= 0 && g['メンバーID'] === memberId && g['種別'] === '通常') {
      stats.goals++;
    }
  });

  // 出場・勝利集計
  // まずマッチごとのスコアを事前計算
  var matchScores = {};
  goals.forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) < 0) return;
    if (!matchScores[g['マッチID']]) matchScores[g['マッチID']] = { A: 0, B: 0 };
    if (g['チーム'] === 'A') matchScores[g['マッチID']].A++;
    if (g['チーム'] === 'B') matchScores[g['マッチID']].B++;
  });

  matchMembers.forEach(function(mm) {
    if (matchIds.indexOf(mm['マッチID']) < 0 || mm['メンバーID'] !== memberId) return;
    stats.played++;

    var match = matches.find(function(mt) { return mt['マッチID'] === mm['マッチID']; });
    if (!match || match['ステータス'] !== '終了') return;

    var sc = matchScores[mm['マッチID']] || { A: 0, B: 0 };
    if ((mm['チーム'] === 'A' && sc.A > sc.B) || (mm['チーム'] === 'B' && sc.B > sc.A)) {
      stats.wins++;
    }
  });

  return stats;
}

// ===================================
// Gemini AI 総合評価
// ===================================

/**
 * AI総合評価用のプロンプトを組み立てる
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} mvpData - getMvpData_の戻り値
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {string} プロンプト文字列
 */
function buildMvpPrompt_(participantIds, mvpData, mvpCount, subMvpCount) {
  var memberLines = participantIds.map(function(mId) {
    var m = mvpData.memberMap[mId] || {};
    var stats = calcMemberStats_(mvpData.matches, mvpData.matchMembers, mvpData.goals, mvpData.matchIds, mId);
    var comments = mvpData.surveyComments
      .filter(function(c) { return c['対象メンバーID'] === mId; })
      .map(function(c) { return '「' + (c['コメント'] || '') + '」'; });

    return '- memberId: "' + mId + '"\n' +
      '  名前: ' + (m['名前'] || '不明') + '\n' +
      '  サッカー経験: ' + (m['サッカー経験'] || '不明') + '\n' +
      '  年次: ' + (m['年次'] || '不明') + '\n' +
      '  備考: ' + (m['備考'] || 'なし') + '\n' +
      '  幹事: ' + (m['幹事'] || 'いいえ') + '\n' +
      '  出場試合数: ' + stats.played + '\n' +
      '  得点数: ' + stats.goals + '\n' +
      '  勝利数: ' + stats.wins + '\n' +
      '  チームメイトからのコメント: ' + (comments.length > 0 ? comments.join(', ') : 'なし');
  });

  return '# 役割\n' +
    'あなたはフットサルイベントの熱血実況アナウンサー兼MVP選考委員長！\n' +
    '今日の激闘を振り返り、表彰式で会場を沸かせるコメントを書いてください！\n\n' +
    '## あなたのキャラ\n' +
    '- テンション高めの実況アナウンサー\n' +
    '- 全員の頑張りを見逃さない、愛がある\n' +
    '- 絵文字OK（🔥⚽🏆👏✨🎯💪😂）\n' +
    '- ユーモアと愛のあるイジりはOK！本人が笑えるネタならアリ\n' +
    '- ただし傷つける表現、人格否定、容姿いじりは絶対NG\n\n' +
    '## 超重要：事実のみを書く\n' +
    '入力データに書かれていることだけを使ってください。\n' +
    '- 得点数、勝利数、出場試合数 → 数字をそのまま使う\n' +
    '- チームメイトからのコメント → 内容を参考にするが、そのまま「」で引用しない。自分の言葉で言い換える\n' +
    '- 備考欄の情報 → 参照してOK、イジりのネタにしてもOK\n' +
    '- 「華麗なドリブル」「決定的なパス」など、入力データにない具体的プレー描写は禁止\n' +
    '- 想像や推測で「〇〇だったに違いない」「きっと〇〇」「〇〇していたはず」は禁止\n\n' +
    '## 出力時の禁止ワード・表現\n' +
    '- 「備考」「備考欄」「評価方針」→ プロンプトの用語を出力に含めない\n' +
    '- 「〜に違いない」「〜だったはず」「きっと〜」→ 推測禁止\n' +
    '- チームメイトのコメントをそのまま「」で引用 → 自分の言葉で表現する\n\n' +
    '例:\n' +
    '× 「パスがうまい」というコメントが寄せられています\n' +
    '○ チームメイトからもパスのうまさを褒められていました！\n\n' +
    '# 評価方針\n' +
    '- 社内フットサル。プロじゃない\n' +
    '- 得点数だけで決めない。雰囲気への貢献、チームメイトからの評価を重視\n' +
    '- 未経験者・若手の積極参加は高評価\n' +
    '- 備考欄の情報（性格、役職など）も考慮\n' +
    '- コメントが多い・ポジティブなメンバーは高評価\n\n' +
    '## 幹事ルール\n' +
    '幹事はMVP・準MVPから除外。ただしスコア・称号・コメントは普通に評価。\n\n' +
    '## 採点基準（0〜100点）\n' +
    '- 90〜100: 文句なしMVP！圧倒的貢献\n' +
    '- 70〜89: MVP候補！目立つ活躍\n' +
    '- 50〜69: ナイスプレー連発！\n' +
    '- 30〜49: しっかり貢献！\n' +
    '- 0〜29: 参加ありがとう！\n\n' +
    '# 入力データ\n' + memberLines.join('\n\n') + '\n\n' +
    '# 出力仕様\n\n' +
    '## 順位\n' +
    '- 上位' + mvpCount + '名 → rank: "MVP"\n' +
    '- 次の' + subMvpCount + '名 → rank: "準MVP"\n' +
    '- それ以外 → rank: ""\n\n' +
    '## 文字数ルール（厳守）\n' +
    '| 対象 | フィールド | 文字数 |\n' +
    '|------|------------|--------|\n' +
    '| MVP・準MVP | reason | 必ず450文字以上書く |\n' +
    '| 全員 | comment | 必ず300文字以上書く |\n\n' +
    '短すぎるコメントはNG！しっかり書いてください。\n\n' +
    '## フィールド\n' +
    '| フィールド | 説明 |\n' +
    '|------------|------|\n' +
    '| memberId | 入力のmemberIdをそのまま |\n' +
    '| score | 0〜100の整数 |\n' +
    '| rank | "MVP" / "準MVP" / "" |\n' +
    '| title | 全員に称号（例: ゴールハンター、縁の下の力持ち、成長株、ムードメーカー） |\n' +
    '| reason | MVP・準MVPのみ選出理由を書く。それ以外は空文字"" |\n' +
    '| rating | 0.0〜10.0（小数第一位） |\n' +
    '| comment | 「〇〇さんへ」で始まる本人へのメッセージ。熱く！愛あるイジりもOK |\n\n' +
    '## NGワード\n' +
    '人格否定、容姿いじり、差別的表現\n\n' +
    '## 出力形式\n' +
    'JSON配列のみ（他テキスト不要）。全メンバー分必須。\n' +
    '```json\n' +
    '[{"memberId": "xxx", "score": 85, "rank": "MVP", "title": "ゴールハンター", "reason": "...", "rating": 8.5, "comment": "〇〇さんへ..."}, ...]\n' +
    '```';
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

      if (!item) {
        return { memberId: mId, name: m['名前'] || '不明', rank: '', title: '', reason: '', totalScore: 0, rating: 0, comment: '' };
      }

      return {
        memberId: mId,
        name: m['名前'] || '不明',
        rank: item.rank || '',
        title: item.title || '',
        reason: item.reason || '',
        totalScore: clamp_(Math.round(Number(item.score) || 0), 0, 100),
        rating: clamp_(Math.round((Number(item.rating) || 0) * 10) / 10, 0, 10),
        comment: item.comment || ''
      };
    });

    results.sort(function(a, b) { return b.totalScore - a.totalScore; });
    return results;
  } catch (e) {
    return { success: false, message: 'AI評価のレスポンス解析に失敗しました: ' + e.message };
  }
}

/**
 * 値を指定範囲にクランプする
 * @param {number} val - 値
 * @param {number} min - 最小値
 * @param {number} max - 最大値
 * @return {number}
 */
function clamp_(val, min, max) {
  return Math.max(min, Math.min(max, val));
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

  var rows = results.map(function(r) {
    return [eventId, r.memberId, r.name, r.rank, r.title, r.reason, r.totalScore, r.rating, r.comment];
  });

  var ss = getSpreadsheet_();
  appendRows_(ss.getSheetByName('MVP結果'), rows);
}

// ===================================
// 公開関数
// ===================================

/**
 * MVP選出を実行する
 * イベントが「試合終了」状態の場合のみ実行可能
 * @param {string} eventId - イベントID
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {Object} 選出結果 { success, results, message }
 */
function selectMVP(eventId, mvpCount, subMvpCount) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== '試合終了') {
    return { success: false, message: 'MVP選出は試合終了後のみ可能です' };
  }

  mvpCount = Number(mvpCount) || 1;
  subMvpCount = Number(subMvpCount) || 1;

  // アンケート回答を自動取得
  if (event['フォームID']) {
    fetchSurveyResponses(eventId);
  }

  var data = getMvpData_(eventId);
  var participantIds = getParticipantIds_(data.matchMembers, data.matchIds);
  if (participantIds.length === 0) {
    return { success: false, message: '参加メンバーがいません' };
  }

  var prompt = buildMvpPrompt_(participantIds, data, mvpCount, subMvpCount);
  var responseText = callGemini_(prompt);
  if (!responseText) {
    return { success: false, message: 'AI評価に失敗しました。GEMINI_API_KEY の設定とAPIの状態を確認してください。' };
  }

  var results = parseMvpResponse_(responseText, participantIds, data.memberMap);
  if (results.success === false) return results;

  saveMvpResults_(eventId, results);
  return { success: true, results: results, message: 'MVP選出が完了しました' };
}
