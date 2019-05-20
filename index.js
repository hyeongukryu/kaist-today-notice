const puppeteer = require('puppeteer');
const fs = require('fs');

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
            const DockerPuppeteerLaunchOptions = {
                executablePath: '/usr/bin/chromium-browser',
                args: ['--disable-dev-shm-usage'],
            };
            if (fs.existsSync(DockerPuppeteerLaunchOptions.executablePath)) {
                browser = await puppeteer.launch(DockerPuppeteerLaunchOptions);
            } else {
                browser = await puppeteer.launch();
            }
            const page = await browser.newPage();
            await page.goto('https://iam.kaist.ac.kr/iamps/mobileLogin.do');
            await page.waitForSelector('#id');
            await page.waitForSelector('#password');
            await page.type('#id', id);
            await page.type('#password', password);
            await page.click('.marg_bt22>a');
            await page.waitForSelector('.user_info');
            await page.goto('https://portal.kaist.ac.kr/index.html');
            await page.waitForSelector('.ptl_search');
            await page.goto(`https://portal.kaist.ac.kr/board/list.brd?boardId=today_notice&pageSize=${size}`);
            await page.waitForSelector('.req_btn_wrap');
            const notices = await page.evaluate(() => {
                const elements = document.querySelectorAll('.req_tit>a');
                const notices = [];
                elements.forEach(e => {
                    notices.push({
                        title: e.text.trim(),
                        link: e.href,
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
