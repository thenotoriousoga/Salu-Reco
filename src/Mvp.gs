// ===================================
// MVP選出（Gemini AI 総合評価）
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
 * メンバーの試合統計を集計する
 * @param {Object[]} matches - マッチデータ
 * @param {Object[]} matchMembers - マッチメンバーデータ
 * @param {Object[]} goals - 得点データ
 * @param {string[]} matchIds - 対象マッチIDの配列
 * @param {string} memberId - メンバーID
 * @param {Object} matchScores - buildMatchScores_の戻り値（事前計算済みスコアマップ）
 * @return {Object} { goals: number, wins: number, played: number, subCount: number }
 */
function calcMemberStats_(matches, matchMembers, goals, matchIds, memberId, matchScores) {
  var stats = { goals: 0, wins: 0, played: 0, subCount: 0 };

  // 得点集計
  goals.forEach(function(g) {
    if (matchIds.indexOf(g['マッチID']) >= 0 && g['メンバーID'] === memberId && g['種別'] === '通常') {
      stats.goals++;
    }
  });

  // 出場・勝利集計
  matchMembers.forEach(function(mm) {
    if (matchIds.indexOf(mm['マッチID']) < 0 || mm['メンバーID'] !== memberId) return;
    stats.played++;
    if (mm['助っ人'] === 'はい') stats.subCount++;

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
  var matchScores = buildMatchScores_(mvpData.goals, mvpData.matchIds);
  var memberLines = participantIds.map(function(mId) {
    var m = mvpData.memberMap[mId] || {};
    var stats = calcMemberStats_(mvpData.matches, mvpData.matchMembers, mvpData.goals, mvpData.matchIds, mId, matchScores);
    var MAX_COMMENTS_PER_MEMBER = 5;
    var MAX_COMMENT_LENGTH = 80;
    var comments = mvpData.surveyComments
      .filter(function(c) { return c['対象メンバーID'] === mId && c['コメント']; })
      .slice(0, MAX_COMMENTS_PER_MEMBER)
      .map(function(c) {
        var text = c['コメント'].length > MAX_COMMENT_LENGTH
          ? c['コメント'].substring(0, MAX_COMMENT_LENGTH) + '…'
          : c['コメント'];
        return '「' + text + '」';
      });

    return '- memberId: "' + mId + '"\n' +
      '  名前: ' + (m['名前'] || '不明') + '\n' +
      '  サッカー経験: ' + (m['サッカー経験'] || '不明') + '\n' +
      '  年次: ' + (m['年次'] || '不明') + '\n' +
      '  備考: ' + (m['備考'] || 'なし') + '\n' +
      '  幹事: ' + (m['幹事'] || 'いいえ') + '\n' +
      '  出場試合数: ' + stats.played + '\n' +
      '  うち助っ人での出場数: ' + stats.subCount + '\n' +
      '  得点数: ' + stats.goals + '\n' +
      '  勝利数: ' + stats.wins + '\n' +
      '  チームメイトからのコメント: ' + (comments.length > 0 ? comments.join(', ') : 'なし');
  });

  return '# 役割\n' +
    'あなたはFIFA会長として、社内フットサル大会の表彰式に特別出席している。\n' +
    '世界のサッカーを統括する立場から、今日の激闘を振り返り、各選手に格式高くも愛のあるメッセージを贈ってください。\n\n' +
    '## あなたのキャラ\n' +
    '- FIFA会長としての威厳と格式を持ちつつ、フレンドリー\n' +
    '- 「私はこれまで数多くのワールドカップを見てきたが...」のような大げさな前置きを時々入れる\n' +
    '- 社内フットサルをまるでFIFAの公式大会かのように大真面目に扱う（そのギャップがユーモア）\n' +
    '- 絵文字OK（🔥⚽🏆👏✨🎯💪🌍🏅）\n' +
    '- 「FIFA会長として正式に認定する」「FIFAランキングに登録したい」など権威を笑いに変える\n' +
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
    '- コメントが多い・ポジティブなメンバーは高評価\n' +
    '- 助っ人での出場（別チームの試合に参戦）はチームへの貢献としてプラス評価\n\n' +
    '## 幹事ルール\n' +
    '幹事はMVP・準MVPから除外。ただしレーティング・称号・コメントは普通に評価。\n\n' +
    '## 採点基準（0.0〜10.0）\n' +
    '- 9.0〜10.0: 文句なしMVP！圧倒的貢献\n' +
    '- 7.0〜8.9: MVP候補！目立つ活躍\n' +
    '- 5.0〜6.9: ナイスプレー連発！\n' +
    '- 3.0〜4.9: しっかり貢献！\n' +
    '- 0.0〜2.9: 参加ありがとう！\n\n' +
    '## スコア分布ルール\n' +
    '- 最高スコアと最低スコアの差は最低3.0以上にすること\n' +
    '- 同じスコアは最大2人まで\n' +
    '- MVP受賞者は必ず8.5以上\n' +
    '- 準MVP受賞者は必ず7.0以上\n\n' +
    '# 入力データ\n' + memberLines.join('\n\n') + '\n\n' +
    '# 出力仕様\n\n' +
    '## 順位\n' +
    '- 上位' + mvpCount + '名 → rank: "MVP"\n' +
    '- 次の' + subMvpCount + '名 → rank: "準MVP"\n' +
    '- それ以外 → rank: ""\n\n' +
    '## 文量ルール（厳守）\n' +
    '| 対象 | フィールド | 文量 |\n' +
    '|------|------------|------|\n' +
    '| MVP・準MVP | reason | 5〜7文で構成すること |\n' +
    '| 全員 | comment | 4〜6文で構成すること |\n\n' +
    '短すぎるコメントはNG！FIFA会長として威厳を持ってしっかり書いてください。\n' +
    '1文は「。」「！」「？」で終わる単位とする。\n\n' +
    '## フィールド\n' +
    '| フィールド | 説明 |\n' +
    '|------------|------|\n' +
    '| memberId | 入力のmemberIdをそのまま |\n' +
    '| rank | "MVP" / "準MVP" / "" |\n' +
    '| title | 全員に称号（例: ゴールハンター、縁の下の力持ち、成長株、ムードメーカー） |\n' +
    '| reason | MVP・準MVPのみ選出理由を書く。それ以外は空文字"" |\n' +
    '| rating | 0.0〜10.0（小数第一位） |\n' +
    '| comment | FIFA会長として「〇〇選手へ」で始まる本人へのメッセージ。威厳とユーモアを込めて！ |\n\n' +
    '## NGワード\n' +
    '人格否定、容姿いじり、差別的表現\n\n' +
    '## 出力形式\n' +
    'JSON配列のみ（他テキスト不要）。全メンバー分必須。\n' +
    '```json\n' +
    '[{"memberId": "xxx", "rank": "MVP", "title": "ゴールハンター", "reason": "...", "rating": 8.5, "comment": "〇〇さんへ..."}, ...]\n' +
    '```\n\n' +
    '## 出力前の最終チェック（必ず確認してから出力）\n' +
    '- 入力データにない具体的プレー描写を書いていないか？\n' +
    '- 推測表現（〜に違いない、きっと〜、〜だったはず）を使っていないか？\n' +
    '- 全員分（' + participantIds.length + '人）のデータが含まれているか？\n' +
    '- reason は5〜7文、comment は4〜6文あるか？\n' +
    '- 最高スコアと最低スコアの差は3.0以上あるか？\n' +
    '- 幹事をMVP・準MVPに選んでいないか？';
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
        return { memberId: mId, name: m['名前'] || '不明', rank: '', title: '', reason: '', rating: 0, comment: '' };
      }

      return {
        memberId: mId,
        name: m['名前'] || '不明',
        rank: item.rank || '',
        title: item.title || '',
        reason: item.reason || '',
        rating: clamp_(Math.round((Number(item.rating) || 0) * 10) / 10, 0, 10),
        comment: item.comment || ''
      };
    });

    results.sort(function(a, b) { return b.rating - a.rating; });
    return results;
  } catch (e) {
    return { success: false, message: 'AI評価のレスポンス解析に失敗しました: ' + e.message };
  }
}

/**
 * MVP選出結果のビジネスルールを検証する
 * @param {Object[]} results - parseMvpResponse_の戻り値
 * @param {number} mvpCount - 期待するMVP人数
 * @param {number} subMvpCount - 期待する準MVP人数
 * @param {Object} memberMap - メンバーIDをキーにしたマップ
 * @return {Object} { valid: boolean, reason: string }
 */
function validateMvpResults_(results, mvpCount, subMvpCount, memberMap) {
  var mvps = results.filter(function(r) { return r.rank === 'MVP'; });
  var subMvps = results.filter(function(r) { return r.rank === '準MVP'; });

  // 幹事がMVP・準MVPに選ばれていないか
  var awardees = mvps.concat(subMvps);
  for (var i = 0; i < awardees.length; i++) {
    var m = memberMap[awardees[i].memberId];
    if (m && m['幹事'] === 'はい') {
      return { valid: false, reason: '幹事（' + awardees[i].name + '）がMVP/準MVPに選出されています' };
    }
  }

  // MVP・準MVPの人数チェック
  if (mvps.length !== mvpCount) {
    return { valid: false, reason: 'MVP人数が不一致（期待: ' + mvpCount + ', 実際: ' + mvps.length + '）' };
  }
  if (subMvps.length !== subMvpCount) {
    return { valid: false, reason: '準MVP人数が不一致（期待: ' + subMvpCount + ', 実際: ' + subMvps.length + '）' };
  }

  // スコア分布チェック: 最高と最低の差が3.0以上
  var ratings = results.map(function(r) { return r.rating; });
  var maxRating = Math.max.apply(null, ratings);
  var minRating = Math.min.apply(null, ratings);
  if (maxRating - minRating < 3.0) {
    return { valid: false, reason: 'スコア分布が不十分（差: ' + (maxRating - minRating).toFixed(1) + ', 最低3.0必要）' };
  }

  // MVP受賞者のスコアが8.5以上か
  for (var j = 0; j < mvps.length; j++) {
    if (mvps[j].rating < 8.5) {
      return { valid: false, reason: 'MVP受賞者（' + mvps[j].name + '）のスコアが8.5未満（' + mvps[j].rating + '）' };
    }
  }

  // 準MVP受賞者のスコアが7.0以上か
  for (var k = 0; k < subMvps.length; k++) {
    if (subMvps[k].rating < 7.0) {
      return { valid: false, reason: '準MVP受賞者（' + subMvps[k].name + '）のスコアが7.0未満（' + subMvps[k].rating + '）' };
    }
  }

  // 全員分のデータがあるか（ratingが0のメンバーが多すぎないか）
  var missingCount = results.filter(function(r) { return r.rating === 0 && r.comment === ''; }).length;
  if (missingCount > 0) {
    return { valid: false, reason: missingCount + '人分のAI評価データが欠落しています' };
  }

  return { valid: true, reason: '' };
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
    return [eventId, r.memberId, r.name, r.rank, r.title, r.reason, r.rating, r.comment];
  });

  var ss = getSpreadsheet_();
  appendRows_(ss.getSheetByName('MVP結果'), rows);
}

// ===================================
// 公開関数
// ===================================

/**
 * MVP選出を実行する
 * イベントが「イベント終了」状態の場合のみ実行可能
 * @param {string} eventId - イベントID
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {Object} 選出結果 { success, results, message }
 */
function selectMVP(eventId, mvpCount, subMvpCount) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== 'イベント終了') {
    return { success: false, message: 'MVP選出はイベント終了後のみ可能です' };
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

  // バリデーション付きリトライループ（最大3回試行）
  var MAX_ATTEMPTS = 3;
  var lastError = '';
  for (var attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    var responseText = callGemini_(prompt);
    if (!responseText) {
      lastError = 'AI評価に失敗しました。GEMINI_API_KEY の設定とAPIの状態を確認してください。';
      continue;
    }

    // JSONパース前に余計な文字を除去（稀にコードブロックで囲まれる場合の対策）
    responseText = responseText.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();

    var results = parseMvpResponse_(responseText, participantIds, data.memberMap);
    if (results.success === false) {
      lastError = results.message;
      Logger.log('MVP選出 試行' + attempt + '/' + MAX_ATTEMPTS + ' パース失敗: ' + lastError);
      continue;
    }

    var validation = validateMvpResults_(results, mvpCount, subMvpCount, data.memberMap);
    if (!validation.valid) {
      lastError = validation.reason;
      Logger.log('MVP選出 試行' + attempt + '/' + MAX_ATTEMPTS + ' バリデーション失敗: ' + lastError);
      continue;
    }

    // 成功
    saveMvpResults_(eventId, results);
    // MVP再選出時は確定フラグをリセット（再度確定が必要）
    updateEventField_(eventId, 9, '');
    return { success: true, results: results, message: 'MVP選出が完了しました' };
  }

  return { success: false, message: 'MVP選出に失敗しました（' + MAX_ATTEMPTS + '回試行）: ' + lastError };
}
