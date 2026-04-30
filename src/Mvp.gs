// ===================================
// MVP選出（AI評価）
// ===================================

// --- MVP選出メイン ---
function selectMVP(eventId) {
  const events = getSheetData_('イベント');
  const event = events.find(e => e['イベントID'] === eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  const mvpCount = Number(event['MVP人数']) || 1;
  const subMvpCount = Number(event['準MVP人数']) || 1;

  // --- データ収集 ---
  const members = getSheetData_('メンバー');
  const memberMap = {};
  members.forEach(m => { memberMap[m['ID']] = m; });

  const rounds = getSheetData_('ラウンド').filter(r => r['イベントID'] === eventId);
  const roundMembers = getSheetData_('ラウンドメンバー');
  const goals = getSheetData_('得点');
  const surveyComments = getSheetData_('アンケート回答').filter(c => c['イベントID'] === eventId);

  // 参加メンバーID一覧
  const roundIds = rounds.map(r => r['ラウンドID']);
  const participantIds = [...new Set(
    roundMembers.filter(rm => roundIds.includes(rm['ラウンドID'])).map(rm => rm['メンバーID'])
  )];

  if (participantIds.length === 0) {
    return { success: false, message: '参加メンバーがいません' };
  }

  // --- 定量評価 ---
  const quantScores = {};
  participantIds.forEach(mId => {
    const m = memberMap[mId] || {};
    let score = 0;

    // 得点数（各ラウンドの合計）
    const totalGoals = goals
      .filter(g => roundIds.includes(g['ラウンドID']) && g['メンバーID'] === mId)
      .reduce((sum, g) => sum + Number(g['得点数']), 0);
    score += totalGoals * 3; // 1得点 = 3ポイント

    // 勝利数
    roundIds.forEach(rId => {
      const rm = roundMembers.find(rm => rm['ラウンドID'] === rId && rm['メンバーID'] === mId);
      if (!rm) return;
      const round = rounds.find(r => r['ラウンドID'] === rId);
      if (!round || round['ステータス'] !== '終了') return;
      const sA = Number(round['スコアA']);
      const sB = Number(round['スコアB']);
      if ((rm['チーム'] === 'A' && sA > sB) || (rm['チーム'] === 'B' && sB > sA)) {
        score += 2; // 勝利 = 2ポイント
      }
    });

    // サッカー経験による補正（未経験者にボーナス）
    if (m['サッカー経験'] === 'なし') {
      score *= 1.3; // 未経験者は30%ボーナス
    }

    // 年次による補正（若手にボーナス）
    const years = Number(m['年次']) || 1;
    if (years <= 2) {
      score *= 1.15; // 若手は15%ボーナス
    }

    quantScores[mId] = Math.round(score * 10) / 10;
  });

  // --- 定性評価（アンケートコメント分析） ---
  const qualScores = {};
  participantIds.forEach(mId => {
    const m = memberMap[mId] || {};
    const comments = surveyComments.filter(c => c['対象メンバーID'] === mId);

    // コメント数ベースのスコア
    let score = comments.length * 2; // 1コメント = 2ポイント

    // コメント内容のポジティブワード分析
    const positiveWords = [
      'すごい', 'うまい', '上手', 'ナイス', 'いい', '良い', 'よかった',
      '活躍', 'MVP', '最高', 'かっこいい', '頑張', 'がんば',
      'アシスト', 'セーブ', 'ディフェンス', '守備', '攻撃',
      '盛り上', '楽し', 'ありがとう', '感謝', '助か',
      'パス', 'シュート', 'ドリブル', '走', '速'
    ];

    comments.forEach(c => {
      const text = c['コメント'] || '';
      positiveWords.forEach(word => {
        if (text.includes(word)) {
          score += 1;
        }
      });
      // 長いコメント = より詳しく評価されている
      if (text.length > 30) score += 1;
      if (text.length > 60) score += 1;
    });

    qualScores[mId] = score;
  });

  // --- 総合スコア計算 ---
  const maxQuant = Math.max(...Object.values(quantScores), 1);
  const maxQual = Math.max(...Object.values(qualScores), 1);

  const totalScores = participantIds.map(mId => {
    const m = memberMap[mId] || {};
    // 正規化して50:50で合算（0-100スケール）
    const normQuant = (quantScores[mId] / maxQuant) * 50;
    const normQual = (qualScores[mId] / maxQual) * 50;
    const total = Math.round((normQuant + normQual) * 10) / 10;

    return {
      memberId: mId,
      name: m['名前'] || '不明',
      quantScore: quantScores[mId],
      qualScore: qualScores[mId],
      totalScore: total
    };
  });

  // スコア降順ソート
  totalScores.sort((a, b) => b.totalScore - a.totalScore);

  // --- 順位付け・理由生成 ---
  const results = totalScores.map((s, i) => {
    let rank = '';
    let reason = '';

    if (i < mvpCount) {
      rank = 'MVP';
      reason = generateMvpReason_(s, memberMap[s.memberId], true);
    } else if (i < mvpCount + subMvpCount) {
      rank = '準MVP';
      reason = generateMvpReason_(s, memberMap[s.memberId], false);
    } else {
      rank = '';
      reason = '';
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

  // --- 結果をシートに保存 ---
  const ss = getSpreadsheet_();
  const mvpSheet = getSheet_('MVP結果', ss);

  // 既存結果をクリア
  const existingData = mvpSheet.getDataRange().getValues();
  for (let i = existingData.length - 1; i >= 1; i--) {
    if (existingData[i][0] === eventId) {
      mvpSheet.deleteRow(i + 1);
    }
  }

  // 新しい結果を保存
  results.forEach(r => {
    mvpSheet.appendRow([
      eventId, r.memberId, r.name, r.rank, r.reason,
      r.quantScore, r.qualScore, r.totalScore
    ]);
  });

  // イベントステータス更新
  updateEventStatus(eventId, '完了');

  return {
    success: true,
    results: results,
    message: 'MVP選出が完了しました'
  };
}

// --- MVP理由生成 ---
function generateMvpReason_(scoreData, memberData, isMvp) {
  const parts = [];
  const m = memberData || {};

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

  const prefix = isMvp ? 'MVP選出理由: ' : '準MVP選出理由: ';
  return prefix + parts.join('、');
}

// --- MVP結果取得 ---
function getMvpResults(eventId) {
  return getSheetData_('MVP結果').filter(r => r['イベントID'] === eventId);
}
