# kaist-today-notice

KAIST 오늘의 공지사항

품질이나 안정성을 보장하지 않습니다.

```bash
npm install kaist-today-notice
```

```JavaScript
const ktn = require('kaist-today-notice');

ktn.run({
  id: 'ID',                   // required         
  password: 'PASSWORD',       // required
  size: 10,                   // optional
  puppeteerLaunchOptions: {}, // optional
}, (err, result) => {
  console.log(result);
});
```

```JavaScript
[
  {
    title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
    link: 'https://portal.kaist.ac.kr/ennotice/lorem_ipsum/42',
  },
  // ...more results
]
```
