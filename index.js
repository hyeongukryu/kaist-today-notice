const puppeteer = require('puppeteer');

module.exports = {
    run,
};

function run(options, callback) {
    const { id, password } = options;
    let { size } = options;
    if (!size) {
        size = 10;
    }
    (async () => {
        let browser = null;
        try {
            browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.goto('https://iam.kaist.ac.kr/iamps/mobileLogin.do');
            await page.waitForSelector('#id');
            await page.waitForSelector('#password');
            await page.type('#id', id);
            await page.type('#password', password);
            await page.click('.marg_bt22>a');
            await page.waitForSelector('.user_info');
            await page.goto('https://portal.kaist.ac.kr/index.html');
            await page.goto(`https://portal.kaist.ac.kr/board/list.brd?boardId=today_notice&pageSize=${size}`);
            const notices = await page.evaluate(() => {
                const elements = document.querySelectorAll('.req_tit>a');
                const notices = [];
                elements.forEach(e => {
                    notices.push({
                        title: e.text.trim(),
                        link: 'https://portal.kaist.ac.kr' + e.href,
                    });
                });
                return notices;
            });
            await browser.close();
            callback(null, notices);
        } catch (e) {
            callback(e);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    })();
}
