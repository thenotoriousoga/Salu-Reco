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
 * AI総合評価用のシステムプロンプトを組み立てる（固定部分：ロール・ルール・出力仕様）
 * 構造: タスク → 出力仕様 → キャラ設定 → 評価方針 → 制約（Lost in the Middle対策）
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @param {number} totalMembers - 参加メンバー総数
 * @return {string} システムプロンプト文字列
 */
function buildMvpSystemPrompt_(mvpCount, subMvpCount, totalMembers) {
  return '# タスク\n' +
    '社内フットサル大会の全選手（' + totalMembers + '人）を評価し、MVP・準MVPを選出して、JSON配列で出力せよ。\n\n' +
    '# 出力仕様（最優先で守ること）\n\n' +
    '## 出力形式\n' +
    'JSON配列のみ（他テキスト不要）。全' + totalMembers + '人分必須。\n\n' +
    '## フィールド\n' +
    '| フィールド | 説明 |\n' +
    '|------------|------|\n' +
    '| memberId | 入力のmemberIdをそのまま |\n' +
    '| rank | "MVP" / "準MVP" / "" |\n' +
    '| title | 全員にユニークな称号（後述の称号ルール参照） |\n' +
    '| reason | MVP・準MVPのみ選出理由。それ以外は空文字"" |\n' +
    '| rating | 0.0〜10.0（小数第一位） |\n' +
    '| comment | FIFA会長として「〇〇選手へ。」で始まる本人へのメッセージ |\n\n' +
    '## 順位\n' +
    '- 上位' + mvpCount + '名 → rank: "MVP"\n' +
    '- 次の' + subMvpCount + '名 → rank: "準MVP"\n' +
    '- それ以外 → rank: ""\n\n' +
    '## 文量ルール（厳守）\n' +
    '| 対象 | フィールド | 文量 |\n' +
    '|------|------------|------|\n' +
    '| MVP・準MVP | reason | 150〜250文字 |\n' +
    '| 全員 | comment | 120〜200文字 |\n\n' +
    '## スコア分布ルール\n' +
    '- 最高スコアと最低スコアの差は最低3.0以上\n' +
    '- 同じスコアは最大2人まで\n' +
    '- MVP受賞者は必ず8.5以上\n' +
    '- 準MVP受賞者は必ず7.0以上\n' +
    '- 幹事はMVP・準MVPから除外（レーティング・称号・コメントは普通に評価）\n\n' +
    '# 役割とキャラ設定\n\n' +
    'あなたはFIFA会長。社内フットサル大会の表彰式に"なぜか"特別出席している。\n\n' +
    '## 口調・語彙\n' +
    '- 語尾: 「〜である」「〜と認定する」「FIFA会長として宣言する」「〜せざるを得ない」\n' +
    '- 社内フットサルをFIFA公式大会として大真面目に扱う（このギャップが笑い）\n' +
    '- 大げさな権威表現を多用:\n' +
    '  「FIFAランキングに緊急登録する」「バロンドール候補リストに追加した」\n' +
    '  「次回W杯の視察リストに入れた」「FIFA規約第○条に基づき〜」\n' +
    '  「国際サッカー連盟の名において〜」\n' +
    '- 弱点にも愛を込めて触れる:\n' +
    '  「得点0は…FIFA会長として見なかったことにしよう」\n' +
    '  「勝利数についてはFIFA本部で再集計を検討する」\n' +
    '- 絵文字は1コメントに2〜3個（多すぎると安っぽい）\n' +
    '- 使用OK: 🔥⚽🏆👏✨🎯💪🏅😤🫡\n\n' +
    '## 称号ルール（重要）\n' +
    '称号は面白さ・意外性重視。皮肉・自虐ネタOK（本人が笑えるレベル）。\n' +
    '全員異なるフォーマットにすること（「〇〇の△△」ばかりにしない）。\n\n' +
    '### 称号の良い例\n' +
    '- 「無慈悲なゴールマシーン」（得点多い人）\n' +
    '- 「ピッチの妖精（ただし得点0）」（貢献はあるが得点なし）\n' +
    '- 「声だけはバロンドール級」（盛り上げ役）\n' +
    '- 「走行距離だけならメッシ超え」（頑張ってたけど結果が…）\n' +
    '- 「FIFA非公認・影のMVP」（幹事で受賞できない人）\n' +
    '- 「社内フットサル界のダークホース」（意外な活躍）\n' +
    '- 「勝利の女神に嫌われた男」（実力あるのに勝てない）\n' +
    '- 「存在感だけでオフサイド」（存在感が強い）\n\n' +
    '### 称号のNG例\n' +
    '- 「下手くそ」「お荷物」「いない方がマシ」→ 人格否定\n' +
    '- 「ゴールハンター」「ムードメーカー」「縁の下の力持ち」→ 無難すぎてつまらない\n\n' +
    '## コメントの構造\n' +
    '1文目: 事実ベースの評価（数字やコメントに基づく）\n' +
    '2文目以降: FIFA会長キャラ全開で面白く締める\n\n' +
    '# 評価方針\n' +
    '- 社内フットサル。プロじゃない。楽しむことが最優先の場\n' +
    '- 得点数だけで決めない。雰囲気への貢献、チームメイトからの評価を重視\n' +
    '- 未経験者・若手の積極参加は高評価\n' +
    '- コメントが多い・ポジティブなメンバーは高評価\n' +
    '- 備考欄の情報（性格、役職など）は評価の加点対象ではない。本人の背景情報としてコメントのネタに使う程度\n\n' +
    '## 採点基準（0.0〜10.0）\n' +
    '| 評価軸 | 重み |\n' +
    '|--------|------|\n' +
    '| チームメイトからの評価（コメントの数・ポジティブさ） | 最重要 |\n' +
    '| 場への貢献（盛り上げ、声かけなど数字に表れない貢献） | 高 |\n' +
    '| 成長・チャレンジ（未経験者の積極参加） | 高 |\n' +
    '| 試合結果（得点数・勝利数） | 参考 |\n' +
    '| 参加姿勢（出場試合数） | 参考 |\n\n' +
    '## スコアの目安\n' +
    '- 9.0〜10.0: 複数軸で突出。周囲からの評価も圧倒的\n' +
    '- 7.0〜8.9: 2つ以上の軸で目立つ貢献\n' +
    '- 5.0〜6.9: 参加して楽しんでいた。平均的\n' +
    '- 3.0〜4.9: 出場が少ない、またはデータが少ない\n\n' +
    '# 制約（厳守・出力前に必ず再確認）\n\n' +
    '## 使ってよい情報\n' +
    '- 得点数、勝利数、出場試合数 → 数字をそのまま使う\n' +
    '- チームメイトからのコメント → 内容を参考にし、自分の言葉で言い換える\n' +
    '- 備考欄の情報 → コメントのネタとして参照OK（ただし評価スコアの加点対象ではない）\n\n' +
    '## 禁止事項\n' +
    '- 入力データにない具体的プレー描写（例:「華麗なドリブル」「決定的なパス」「鮮やかなシュート」）\n' +
    '- 推測表現（「〜に違いない」「きっと〜」「〜だったはず」「〜したことだろう」）\n' +
    '- チームメイトのコメントを「」でそのまま引用すること\n' +
    '- プロンプト内部の用語（「備考」「備考欄」「評価方針」「評価軸」）\n' +
    '- 人格否定、容姿いじり、差別的表現\n' +
    '- 無難すぎる称号（「ゴールハンター」「ムードメーカー」「縁の下の力持ち」「成長株」）\n\n' +
    '## 良い例・悪い例\n' +
    '× 「パスがうまい」というコメントが寄せられています → コメント直接引用\n' +
    '○ チームメイトからもパスセンスを絶賛されていた → 自分の言葉で言い換え\n' +
    '× 華麗なドリブルで相手を翻弄した → データにないプレー描写\n' +
    '○ 出場4試合で3得点、数字が全てを物語っている → 事実ベース\n\n' +
    '# 出力例\n\n' +
    '## MVP受賞者の例\n' +
    '{"memberId": "m001", "rank": "MVP", "title": "無慈悲なゴールマシーン", "reason": "出場4試合で3得点。この決定力はFIFA会長として見過ごせない。チームメイトからも「頼れるエース」と複数の声が上がっており、信頼度は社内フットサル界でトップクラスである。勝利数3はチーム最多タイ。未経験からのスタートでこの成績、国際サッカー連盟の記録に残すべき偉業と認定する。", "rating": 9.2, "comment": "田中選手へ。3得点、勝利数3。FIFA会長として正式に宣言する、あなたは社内フットサル界の至宝である⚽ チームメイトが口を揃えてあなたを称えていた事実、これはもうFIFAランキングに緊急登録するしかない。未経験からのスタート？ そんな経歴詐称を疑うレベルだ🏆 次回大会では相手チームがあなた専用の対策会議を開くことになるだろう。FIFA本部から視察員を派遣する用意がある🫡"}\n\n' +
    '## 一般選手の例\n' +
    '{"memberId": "m005", "rank": "", "title": "ピッチの妖精（ただし得点0）", "reason": "", "rating": 5.8, "comment": "佐藤選手へ。出場3試合、得点0、勝利1。数字だけ見ればFIFA会長として厳しい評価を下さざるを得ない…と言いたいところだが🤔 チームメイトから「いるだけで安心する」という声が複数届いている。これはもはや数字では測れない存在価値だ。得点という物理的証拠を次回は頼む。FIFA規約上、妖精の存在は認められていないので💪"}\n\n' +
    '# 出力前の最終チェック（必ず確認してから出力）\n' +
    '- [ ] 入力データにない具体的プレー描写を書いていないか？\n' +
    '- [ ] 推測表現を使っていないか？\n' +
    '- [ ] 全員分（' + totalMembers + '人）のデータが含まれているか？\n' +
    '- [ ] reason は150〜250文字、comment は120〜200文字あるか？\n' +
    '- [ ] 最高スコアと最低スコアの差は3.0以上あるか？\n' +
    '- [ ] 幹事をMVP・準MVPに選んでいないか？\n' +
    '- [ ] 称号が全員異なるフォーマットか？無難すぎないか？\n' +
    '- [ ] 称号に人格否定・能力の全否定が含まれていないか？';
}

/**
 * AI総合評価用のユーザープロンプトを組み立てる（可変部分：入力データ）
 * 情報量ゼロの行は省略してトークン数を削減する
 * @param {string[]} participantIds - 参加メンバーIDの配列
 * @param {Object} mvpData - getMvpData_の戻り値
 * @return {string} ユーザープロンプト文字列
 */
function buildMvpUserPrompt_(participantIds, mvpData) {
  var matchScores = buildMatchScores_(mvpData.goals, mvpData.matchIds);
  var memberLines = participantIds.map(function(mId) {
    var m = mvpData.memberMap[mId] || {};
    var stats = calcMemberStats_(mvpData.matches, mvpData.matchMembers, mvpData.goals, mvpData.matchIds, mId, matchScores);
    var comments = mvpData.surveyComments
      .filter(function(c) { return c['対象メンバーID'] === mId && c['コメント']; })
      .map(function(c) { return '「' + c['コメント'] + '」'; });

    // 必須フィールド
    var lines = [
      '- memberId: "' + mId + '"',
      '  名前: ' + (m['名前'] || '不明'),
      '  出場: ' + stats.played + '試合 / 得点: ' + stats.goals + ' / 勝利: ' + stats.wins,
      '  経験: ' + m['サッカー経験'],
      '  年次: ' + m['年次'],
      '  備考: ' + m['備考']
    ];

    // 条件付きフィールド
    if (m['幹事'] === 'はい') {
      lines.push('  ★幹事（MVP/準MVP対象外）');
    }
    if (comments.length > 0) {
      lines.push('  コメント: ' + comments.join(' / '));
    }

    return lines.join('\n');
  });

  return '全' + participantIds.length + '人分のMVP評価をJSON配列で出力せよ。制約を厳守。\n\n' +
    '# 選手データ\n' + memberLines.join('\n\n');
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
 * MVP選出を非同期で実行する（UIをブロックしない）
 * トリガー経由で selectMVP_ を実行し、完了後にLINE通知を送信する
 * @param {string} eventId - イベントID
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {Object} { success: true, message: '...' }
 */
function selectMVP(eventId, mvpCount, subMvpCount) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== 'イベント終了') {
    return { success: false, message: 'MVP選出はイベント終了後のみ可能です' };
  }

  // 既に選出中なら二度押し防止
  if (isMvpSelecting_(eventId)) {
    return { success: false, message: 'MVP選出が進行中です。しばらくお待ちください。' };
  }

  mvpCount = Number(mvpCount) || 1;
  subMvpCount = Number(subMvpCount) || 1;

  // 非同期で実行をスケジュール
  scheduleMvpSelection_(eventId, mvpCount, subMvpCount);

  return { success: true, message: 'MVP選出を開始しました。しばらくお待ちください。' };
}

/**
 * MVP選出が進行中かどうかを返す
 * @param {string} eventId - イベントID
 * @return {boolean}
 */
function isMvpSelecting_(eventId) {
  var props = PropertiesService.getScriptProperties();
  var reqJson = props.getProperty('MVP_SELECTION_REQUEST');
  if (!reqJson) return false;
  try {
    var req = JSON.parse(reqJson);
    return req.eventId === eventId;
  } catch (e) {
    return false;
  }
}

/**
 * MVP選出ステータスを取得する（フロントからのポーリング用）
 * @param {string} eventId - イベントID
 * @return {Object} { selecting: boolean }
 */
function getMvpSelectionStatus(eventId) {
  return { selecting: isMvpSelecting_(eventId) };
}

/**
 * MVP選出をトリガーで非同期実行するためにキューに積む
 * @param {string} eventId - イベントID
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 */
function scheduleMvpSelection_(eventId, mvpCount, subMvpCount) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MVP_SELECTION_REQUEST', JSON.stringify({
    eventId: eventId, mvpCount: mvpCount, subMvpCount: subMvpCount
  }));

  // トリガーが既にあれば追加しない
  var triggers = ScriptApp.getProjectTriggers();
  var hasExisting = triggers.some(function(t) {
    return t.getHandlerFunction() === 'executeMvpSelection_';
  });

  if (!hasExisting) {
    ScriptApp.newTrigger('executeMvpSelection_')
      .timeBased()
      .after(1000)
      .create();
  }
}

/**
 * トリガーから呼ばれるMVP選出実行関数
 * 選出完了後にLINE通知をスケジュールする
 */
function executeMvpSelection_() {
  var props = PropertiesService.getScriptProperties();
  var reqJson = props.getProperty('MVP_SELECTION_REQUEST');

  if (!reqJson) {
    cleanupMvpTriggers_();
    return;
  }

  try {
    var req = JSON.parse(reqJson);
    var result = selectMVP_(req.eventId, req.mvpCount, req.subMvpCount);

    if (result.success) {
      Logger.log('MVP選出完了: ' + req.eventId);
    } else {
      Logger.log('MVP選出失敗: ' + result.message);
    }
  } catch (e) {
    Logger.log('MVP選出トリガー実行エラー: ' + e.message);
  }

  props.deleteProperty('MVP_SELECTION_REQUEST');
  cleanupMvpTriggers_();
}

/**
 * executeMvpSelection_ のトリガーを削除する
 */
function cleanupMvpTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'executeMvpSelection_') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * MVP選出の実処理（内部関数）
 * @param {string} eventId - イベントID
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {Object} 選出結果 { success, results, message }
 */
function selectMVP_(eventId, mvpCount, subMvpCount) {
  var event = findEvent_(eventId);

  // アンケート回答を自動取得
  if (event['フォームID']) {
    fetchSurveyResponses(eventId);
  }

  var data = getMvpData_(eventId);
  var participantIds = getParticipantIds_(data.matchMembers, data.matchIds);
  if (participantIds.length === 0) {
    return { success: false, message: '参加メンバーがいません' };
  }

  var systemPrompt = buildMvpSystemPrompt_(mvpCount, subMvpCount, participantIds.length);
  var userPrompt = buildMvpUserPrompt_(participantIds, data);

  // バリデーション付きリトライループ（最大4回試行: temperature高めのため余裕を持たせる）
  var MAX_ATTEMPTS = 4;
  var lastError = '';
  for (var attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    var responseText = callGemini_(systemPrompt, userPrompt);
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
