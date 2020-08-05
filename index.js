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
                args: [
                    '--disable-dev-shm-usage',
                    '--lang=ko-KR',
                    '--headless',
                    '--disable-gpu',
                    '--single-process',
                    '--no-zygote',
                ],
            };
            if (fs.existsSync(DockerPuppeteerLaunchOptions.executablePath)) {
                browser = await puppeteer.launch(DockerPuppeteerLaunchOptions);
            } else {
                browser = await puppeteer.launch();
            }
            const page = await browser.newPage();
            await page.goto('https://iam2.kaist.ac.kr/#/userLogin');
            await page.waitForSelector('input[type=text]');
            await page.waitForSelector('input[type=password]');
            await page.type('input[type=text]', id);
            await page.type('input[type=password]', password);
            await page.click('input[type=submit]');
            await page.waitForSelector('.navbar-nav');
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
