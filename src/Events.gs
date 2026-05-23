// ===================================
// イベント管理
// イベントCRUD（作成・取得・更新・ステータス遷移）
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
 * @param {string} eventId - イベントID
 * @return {Object|null} イベント詳細データ
 */
function getEventDetail(eventId) {
  var data = getMultipleSheetData_(['イベント', 'メンバー', 'ラウンド', 'マッチ', 'マッチメンバー', '得点', 'MVP結果']);

  var event = data['イベント'].find(function(e) { return e['イベントID'] === eventId; });
  if (!event) return null;

  var members = data['メンバー'].filter(function(m) { return m['イベントID'] === eventId; });
  var memberMap = buildMap_(members, 'メンバーID');

  var rounds = buildRoundsData_(
    data['ラウンド'].filter(function(r) { return r['イベントID'] === eventId; }),
    data['マッチ'], data['マッチメンバー'], data['得点'], memberMap
  );

  var mvpResults = data['MVP結果'].filter(function(r) { return r['イベントID'] === eventId; });

  var surveyVoters = [];
  if (event['フォームID']) {
    surveyVoters = getSurveyVoters(eventId);
  }

  // クライアントに幹事パスワードを渡さない
  var safeEvent = {};
  Object.keys(event).forEach(function(k) {
    if (k !== '幹事パスワード') safeEvent[k] = event[k];
  });

  return {
    event: safeEvent,
    members: members,
    rounds: rounds,
    mvpResults: mvpResults,
    surveyVoters: surveyVoters
  };
}

// ===================================
// イベント作成
// ===================================

/**
 * イベントを作成する（管理者・幹事共通）
 * イベント作成 + 参加コード自動生成 + 幹事メンバー登録を一括で行う
 * メールアドレスが指定された場合、参加コードとアプリURLをメール送信する
 * @param {string} name - イベント名
 * @param {string} date - 日付（yyyy-MM-dd 形式）
 * @param {string} organizerName - 幹事の名前
 * @param {string} [email] - 送信先メールアドレス（任意）
 * @param {string} [password] - 幹事パスワード
 * @return {Object} 結果オブジェクト
 *   { success, eventId, code, organizerMemberId, emailSent, message }
 */
function createEventAsOrganizer(name, date, organizerName, email, password) {
  var trimmedName = (name || '').trim();
  var trimmedOrganizer = (organizerName || '').trim();
  var trimmedEmail = (email || '').trim();
  var trimmedPassword = (password || '').trim();

  if (!trimmedName) {
    return { success: false, message: 'イベント名を入力してください' };
  }
  if (!trimmedOrganizer) {
    return { success: false, message: 'あなたの名前を入力してください' };
  }
  if (!date) {
    return { success: false, message: '日付を選択してください' };
  }
  if (!trimmedPassword) {
    return { success: false, message: '幹事パスワードを設定してください' };
  }
  if (trimmedEmail && !isValidEmail_(trimmedEmail)) {
    return { success: false, message: 'メールアドレスの形式が正しくありません' };
  }

  var code = generateUniqueEventCode_();
  if (!code) {
    return { success: false, message: '参加コードの生成に失敗しました。時間をおいて再度お試しください' };
  }

  var ss = getSpreadsheet_();
  var eventSheet = ensureSheet_(ss, 'イベント');
  var memberSheet = ensureSheet_(ss, 'メンバー');

  var eventId = generateId_();
  eventSheet.appendRow([eventId, date, trimmedName, '準備中', '', '', code, trimmedPassword]);

  // 幹事を最初のメンバーとして登録
  var memberId = generateId_();
  memberSheet.appendRow([
    memberId,
    eventId,
    trimmedOrganizer,
    1,          // 年次: デフォルト1
    'なし',     // サッカー経験: デフォルトなし
    'はい',     // 幹事: はい
    '',         // 備考
    ''          // 意気込み
  ]);

  // メール送信（任意）。失敗してもイベント作成自体は成功として扱う
  var emailSent = false;
  if (trimmedEmail) {
    emailSent = sendEventCodeMail_(trimmedEmail, trimmedName, date, code);
  }

  return {
    success: true,
    eventId: eventId,
    code: code,
    organizerMemberId: memberId,
    emailSent: emailSent,
    message: 'イベントを作成しました'
  };
}

/**
 * メールアドレスの簡易バリデーション
 * @param {string} email
 * @return {boolean}
 */
function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 参加コードとアプリURLをメール送信する
 * @param {string} to - 送信先メールアドレス
 * @param {string} eventName - イベント名
 * @param {string} date - 日付
 * @param {string} code - 参加コード
 * @return {boolean} 送信に成功したかどうか
 */
function sendEventCodeMail_(to, eventName, date, code) {
  try {
    var appUrl = ScriptApp.getService().getUrl() || '';
    var subject = '【Salu-Rec】イベント「' + eventName + '」の参加コード';
    var body = [
      eventName + ' の参加コードをお届けします。',
      '',
      '日付　　　: ' + date,
      '参加コード: ' + code,
      '',
      'アプリURL:',
      appUrl,
      '',
      '参加者にはこのメールを転送するか、参加コードを共有してください。',
      '',
      '---',
      'Salu-Rec'
    ].join('\n');
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body,
      name: 'Salu-Rec'
    });
    return true;
  } catch (e) {
    console.warn('メール送信に失敗しました: ' + (e && e.message ? e.message : e));
    return false;
  }
}

/**
 * 既存イベントと重複しない参加コードを自動生成する
 * 紛らわしい文字（0/O, 1/I/L）を除いた英数字で構成
 * @return {string|null} 4文字のコード、生成失敗時はnull
 */
function generateUniqueEventCode_() {
  var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var existing = getSheetData_('イベント');
  var used = {};
  existing.forEach(function(e) {
    used[String(e['コード']).toUpperCase()] = true;
  });

  // 4文字で最大30回試行
  for (var attempt = 0; attempt < 30; attempt++) {
    var code = '';
    for (var i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!used[code]) return code;
  }

  // 4文字で枯渇した場合は5文字で再試行
  for (var attempt2 = 0; attempt2 < 30; attempt2++) {
    var code2 = '';
    for (var j = 0; j < 5; j++) {
      code2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!used[code2]) return code2;
  }

  return null;
}

// ===================================
// イベント更新
// ===================================

/**
 * イベントの特定フィールドを更新する
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
 * @param {string} status - ステータス（準備中/進行中/イベント終了）
 * @return {Object} 結果オブジェクト { success }
 */
function updateEventStatus(eventId, status) {
  updateEventField_(eventId, 4, status);
  return { success: true };
}

// ===================================
// ステータス遷移
// ===================================

/**
 * イベントを「進行中」状態にする
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function startEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== '準備中') {
    return { success: false, message: '準備中のイベントのみ開始できます' };
  }

  // メンバーが2名以上登録されているかチェック
  var members = getSheetData_('メンバー').filter(function(m) { return m['イベントID'] === eventId; });
  if (members.length < 2) {
    return { success: false, message: 'メンバーを2名以上登録してからイベントを開始してください' };
  }

  updateEventStatus(eventId, '進行中');
  return { success: true, message: 'イベントを開始しました。チーム分けを行いましょう！' };
}

/**
 * イベントを「イベント終了」状態にする
 * 全ラウンドが終了している必要がある
 * @param {string} eventId - イベントID
 * @return {Object} 結果オブジェクト { success, message }
 */
function endEvent(eventId) {
  var event = findEvent_(eventId);
  if (!event) return { success: false, message: 'イベントが見つかりません' };
  if (event['ステータス'] !== '進行中') {
    return { success: false, message: '進行中のイベントのみ終了できます' };
  }

  // 進行中ラウンドのチェック（マッチはラウンド終了時に必ず終了済みになるため確認不要）
  var rounds = getSheetData_('ラウンド').filter(function(r) { return r['イベントID'] === eventId; });

  if (rounds.length === 0) {
    return { success: false, message: 'ラウンドがありません' };
  }
  if (rounds.some(function(r) { return r['ステータス'] !== '終了'; })) {
    return { success: false, message: 'イベントを終了するには先にラウンドを終了してください' };
  }

  updateEventStatus(eventId, 'イベント終了');
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
  if (event['ステータス'] !== 'イベント終了') {
    return { success: false, message: 'イベント終了状態のイベントのみ再開できます' };
  }

  updateEventStatus(eventId, '進行中');
  return { success: true, message: 'イベントを進行中に戻しました' };
}
