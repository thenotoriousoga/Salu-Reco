package com.salurec.member.domain.exception

import com.salurec.shared.domain.DomainException

class MemberNotFoundException(memberId: String) :
    DomainException("メンバーが見つかりません: memberId=$memberId")
