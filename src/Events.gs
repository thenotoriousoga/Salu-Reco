// ===================================
// イベント管理
// イベントCRUD（作成・取得・更新）
// ===================================

// ===================================
// イベント取得
// ===================================

/**
 * 全イベントを取得する（新しい順）
 * @return {Object[]} イベント配列
 */
function getEvents() {
  return getSheetData_('イベント').reverse();
}

/**
 * イベントIDでイベントデータを検索する
 * @param {string} eventId - イベントID
 * @return {Object|null} イベントオブジェクト、見つからない場合はnull
 */
function findEvent_(eventId) {
  var events = getSheetData_('イベント');
  return events.find(function(e) { return e['イベントID'] === eventId; }) || null;
}

/**
 * イベント詳細を取得する（メンバー・ラウンド・MVP結果含む）
 * 全データを一括取得してからフィルタリングすることで高速化
 * @param {string} eventId - イベントID
 * @return {Object|null} イベント詳細データ
 */
function getEventDetail(eventId) {
  // 必要な全シートを一括取得
  var data = getMultipleSheetData_(['イベント', 'メンバー', 'ラウンド', 'マッチ', 'マッチメンバー', '得点', 'MVP結果']);

  var event = data['イベント'].find(function(e) { return e['イベントID'] === eventId; });
  if (!event) return null;

  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  // ラウンドとマッチデータを構築
  var eventRounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });
  var allMatches = data['マッチ'];
  var matchMembers = data['マッチメンバー'];
  var goals = data['得点'];

  var rounds = eventRounds.map(function(round) {
    var rId = round['ラウンドID'];
    var splitData = null;
    try { splitData = JSON.parse(round['チーム分けJSON']); } catch (e) { splitData = null; }

    var rMatches = allMatches
      .filter(function(m) { return m['ラウンドID'] === rId; })
      .sort(function(a, b) { return a['マッチ番号'] - b['マッチ番号']; });

    var matchesData = rMatches.map(function(match) {
      return buildMatchData_(match, matchMembers, goals, memberMap);
    });

    return {
      id: rId,
      roundNumber: round['ラウンド番号'],
      status: round['ステータス'],
      splitData: splitData,
      matches: matchesData
    };
  }).sort(function(a, b) { return a.roundNumber - b.roundNumber; });

  var mvpResults = data['MVP結果'].filter(function(r) { return r['イベントID'] === eventId; });

  return {
    event: event,
    members: members,
    rounds: rounds,
    mvpResults: mvpResults
  };
}

// ===================================
// イベント作成
// ===================================

/**
 * 新規イベントを作成する
 * @param {string} date - 日付
 * @param {string} name - イベント名
 * @param {string} code - 参加コード
 * @return {Object} 結果オブジェクト { success, eventId, code, message }
 */
function createNewEvent(date, name, code) {
  if (!code || !code.trim()) {
    return { success: false, message: '参加コードを入力してください' };
  }
  code = code.trim().toUpperCase();

  // コード重複チェック
  var existing = getSheetData_('イベント');
  var dup = existing.find(function(e) { return String(e['コード']).toUpperCase() === code; });
  if (dup) {
    return { success: false, message: 'このコードは既に使われています' };
  }

  var ss = getSpreadsheet_();
  var sheet = ensureSheet_(ss, 'イベント');
  var eventId = generateId_();
  sheet.appendRow([eventId, date, name || 'フットサル', '準備中', 1, 1, '', '', code]);

  return { success: true, eventId: eventId, code: code, message: 'イベントを作成しました' };
}

// ===================================
// イベント更新
// ===================================

/**
 * イベントの特定フィールドを更新する（内部用）
 * @param {string} eventId - イベントID
 * @param {number} colIndex - 列インデックス（1始まり）
 * @param {*} value - 設定する値
 * @return {boolean} 成功したかどうか
 */
function updateEventField_(eventId, colIndex, value) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex === -1) return false;
  sheet.getRange(rowIndex, colIndex).setValue(value);
  return true;
}

/**
 * イベントのステータスを更新する
 * @param {string} eventId - イベントID
 * @param {string} status - ステータス（準備中/進行中/試合終了/完了）
 * @return {Object} 結果オブジェクト { success }
 */
function updateEventStatus(eventId, status) {
  updateEventField_(eventId, 4, status);
  return { success: true };
}

/**
 * イベントを「試合終了」状態にする
 * 全ラウンド・全マッチが終了している必要がある
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function endEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var status = event['ステータス'];
  if (status !== '進行中') {
    return { success: false, message: '進行中のイベントのみ終了できます' };
  }

  // 全ラウンド・全マッチが終了しているかチェック
  var data = getMultipleSheetData_(['ラウンド', 'マッチ']);
  var rounds = data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; });

  if (rounds.length === 0) {
    return { success: false, message: 'ラウンドがありません' };
  }

  var hasOngoingRound = rounds.some(function(r) { return r['ステータス'] !== '終了'; });
  if (hasOngoingRound) {
    return { success: false, message: '進行中のラウンドがあります。先にラウンドを終了してください' };
  }

  var roundIds = rounds.map(function(r) { return r['ラウンドID']; });
  var matches = data['マッチ'].filter(function(m) { return roundIds.indexOf(m['ラウンドID']) >= 0; });
  var hasOngoingMatch = matches.some(function(m) { return m['ステータス'] !== '終了'; });
  if (hasOngoingMatch) {
    return { success: false, message: '進行中の試合があります。先に試合を終了してください' };
  }

  updateEventStatus(eventId, '試合終了');
  return { success: true, message: 'イベントを終了しました。MVP選出が可能です' };
}

/**
 * イベントを「進行中」状態に戻す
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function reopenEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var status = event['ステータス'];
  if (status !== '試合終了') {
    return { success: false, message: '試合終了状態のイベントのみ再開できます' };
  }

  updateEventStatus(eventId, '進行中');
  return { success: true, message: 'イベントを進行中に戻しました' };
}

/**
 * イベントを「完了」状態にする
 * Googleフォームの回答受付も停止する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function completeEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var status = event['ステータス'];
  if (status !== '試合終了') {
    return { success: false, message: '試合終了状態のイベントのみ完了にできます' };
  }

  // Googleフォームの回答受付を停止
  if (event['フォームID']) {
    try {
      var form = FormApp.openById(event['フォームID']);
      form.setAcceptingResponses(false);
    } catch (e) {
      // フォームが見つからない場合は無視
    }
  }

  updateEventStatus(eventId, '完了');
  return { success: true, message: 'イベントを完了しました' };
}

/**
 * イベントを「試合終了」状態に戻す（完了から差し戻し）
 * Googleフォームの回答受付を再開する
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function uncompleteEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };

  var status = event['ステータス'];
  if (status !== '完了') {
    return { success: false, message: '完了状態のイベントのみ差し戻しできます' };
  }

  // Googleフォームの回答受付を再開
  if (event['フォームID']) {
    try {
      var form = FormApp.openById(event['フォームID']);
      form.setAcceptingResponses(true);
    } catch (e) {
      // フォームが見つからない場合は無視
    }
  }

  updateEventStatus(eventId, '試合終了');
  return { success: true, message: 'イベントを試合終了に戻しました' };
}

/**
 * MVP設定を更新する
 * @param {string} eventId - イベントID
 * @param {number} mvpCount - MVP人数
 * @param {number} subMvpCount - 準MVP人数
 * @return {Object} 結果オブジェクト { success, message }
 */
function updateMvpSettings(eventId, mvpCount, subMvpCount) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('イベント');
  var rowIndex = findRowIndex_(sheet, 0, eventId);
  if (rowIndex === -1) {
    return { success: false, message: 'イベントが見つかりません' };
  }
  // 2つのセルを一括更新（setValueの繰り返しより高速）
  sheet.getRange(rowIndex, 5, 1, 2).setValues([[Number(mvpCount) || 1, Number(subMvpCount) || 1]]);
  return { success: true, message: 'MVP設定を更新しました' };
}
