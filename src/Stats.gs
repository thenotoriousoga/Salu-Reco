// ===================================
// 統計・集計
// ===================================

function getStats() {
  const members = getSheetData_('メンバー');
  const rounds = getSheetData_('ラウンド');
  const roundMembers = getSheetData_('ラウンドメンバー');
  const goals = getSheetData_('得点');
  const mvpResults = getSheetData_('MVP結果');

  const stats = members.map(member => {
    const mId = member['ID'];

    // 出場ラウンド
    const playedRounds = roundMembers.filter(rm => rm['メンバーID'] === mId).map(rm => ({
      roundId: rm['ラウンドID'],
      team: rm['チーム']
    }));

    let wins = 0, losses = 0, draws = 0;
    playedRounds.forEach(pr => {
      const round = rounds.find(r => r['ラウンドID'] === pr.roundId);
      if (round && round['ステータス'] === '終了') {
        const sA = Number(round['スコアA']);
        const sB = Number(round['スコアB']);
        if (sA === sB) {
          draws++;
        } else if ((pr.team === 'A' && sA > sB) || (pr.team === 'B' && sB > sA)) {
          wins++;
        } else {
          losses++;
        }
      }
    });

    // 総得点
    const totalGoals = goals
      .filter(g => g['メンバーID'] === mId)
      .reduce((sum, g) => sum + Number(g['得点数']), 0);

    // MVP回数
    const mvpCount = mvpResults.filter(r => r['メンバーID'] === mId && r['順位'] === 'MVP').length;
    const subMvpCount = mvpResults.filter(r => r['メンバーID'] === mId && r['順位'] === '準MVP').length;

    return {
      id: mId,
      name: member['名前'],
      years: member['年次'],
      experience: member['サッカー経験'],
      isOrganizer: member['幹事'],
      played: playedRounds.length,
      wins: wins,
      losses: losses,
      draws: draws,
      goals: totalGoals,
      mvpCount: mvpCount,
      subMvpCount: subMvpCount
    };
  });

  return stats.sort((a, b) => b.goals - a.goals);
}
