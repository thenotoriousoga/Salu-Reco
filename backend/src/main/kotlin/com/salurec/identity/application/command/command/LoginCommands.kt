package com.salurec.identity.application.command.command

/** 管理者パスワードログイン */
data class LoginAsAdminCommand(val password: String)

/** 参加コードでのイベント参加ログイン */
data class LoginWithJoinCodeCommand(val joinCode: String)
