# kaist-today-notice

KAIST 오늘의 공지사항

품질이나 안정성을 보장하지 않습니다.

```bash
npm install kaist-today-notice
```

```TypeScript
import run from 'kaist-today-notice';

async function main() {
    try {
        const notices = await run({
            id: 'ID',                      // required         
            password: 'PASSWORD',          // required
            otpSecret: 'BASE32GOTPSECRET', // required
            size: 10,                      // optional
            puppeteerLaunchOptions: {},    // optional
            lang: 'ko'                     // optional
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
