# kaist-today-notice

- KAIST 오늘의 공지사항
- 품질이나 안정성을 보장하지 않습니다.
- generateOtp는 6자리 KAIST OTP를 계산해야 하며, 계산 방법은 공개하지 않습니다. 60초 OTP 윈도 종료가 임박한 경우, 다음 윈도가 시작한 이후에 `Promise`를 resolve하십시오.

```bash
npm install kaist-today-notice
```

```TypeScript
import run from 'kaist-today-notice';

async function main() {
    try {
        const notices = await run({
            id: 'ID',                           // required         
            password: 'PASSWORD',               // required
            generateOtp: () => Promise<string>, // required
            size: 10,                           // optional
            lang: 'ko'                          // optional
        });
        console.log(notices);
    } catch (e) {
        console.error(e);
    }
}
main();
```

```TypeScript
interface KaistTodayNotice {
    title: string;
    link: string;
    organization: string;
    author: string;
    views: number;
    date: string;
}

[
  {
    title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
    link: 'https://portal.kaist.ac.kr/ennotice/lorem_ipsum/42',
    organization: '전산학부',
    author: '넙죽이',
    views: 42,
    date: '1971-02-16',
  },
  // ...more results
]
```
