# kaist-today-notice

- KAIST 게시판
- 품질이나 안정성을 보장하지 않습니다.

```bash
npm install kaist-today-notice
```

- 차세대 포탈을 지원하는 버전의 자세한 사용 방법은 아직 작성되지 않았습니다.

- 간편 로그인은 사용자 이름만 있으면 통과할 수 있어서 승인 절차까지 자동화하는 경우 위험할 수 있으므로, 이메일 인증 번호를 사용하는 방식만 구현하고 있습니다.

- 로그인을 병렬로 동시 진행하면 마지막에 이메일로 전송된 OTP만 유효하며, 실패 시 Error가 발생(throw)합니다. `login`에서 발생할 수 있는 오류를 catch해야 하며, 가급적 외부에서 잠금을 구현하거나 적절한 백오프를 적용하십시오. `loginWithRetry`는 단순한 백오프 전략을 제공합니다.
