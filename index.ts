import puppeteer, {
    BrowserConnectOptions, BrowserLaunchArgumentOptions, LaunchOptions, Product,
} from 'puppeteer';

export type PuppeteerLaunchOptions =
    LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions & {
        product?: Product;
        extraPrefsFirefox?: Record<string, unknown>;
    };

export interface KaistTodayNoticeRunOptions {
    id: string;
    password: string;
    generateOtp: () => Promise<string>;
    size?: number;
    puppeteerLaunchOptions?: PuppeteerLaunchOptions;
    lang?: 'ko' | 'en';
}

export interface KaistTodayNotice {
    title: string;
    link: string;
    organization: string;
    author: string;
    views: number;
    date: string;
}

function normalizeDate(date: string): string {
    const digits = date.replaceAll('.', '');
    return `${digits.substring(0, 4)}-${digits.substring(4, 6)}-${digits.substring(6, 8)}`;
}

export default async function run(
    options: KaistTodayNoticeRunOptions,
): Promise<KaistTodayNotice[] | null> {
    const {
        id, password, puppeteerLaunchOptions, lang, generateOtp,
    } = options;
    const size = options.size ?? 10;

    let browser = null;
    try {
        browser = await puppeteer.launch(puppeteerLaunchOptions);
        const page = await browser.newPage();
        await page.goto('https://iam2.kaist.ac.kr/#/userLogin');
        await page.waitForSelector('input[type=text]');
        await page.waitForSelector('input[type=password]');
        await page.type('input[type=text]', id);
        await page.waitForSelector('input[type=submit]');
        const loginMethods = await page.$$('input[type=submit]');
        await loginMethods[1].click();
        await page.type('input[type=password]', password);
        await page.waitForSelector('.loginbtn');
        await page.click('.loginbtn');

        await page.waitForSelector('input[id=motp]');
        await page.click('input[id=motp]');
        await page.waitForSelector('.pass > input[type=password]');
        await page.type('.pass > input[type=password]', await generateOtp());
        await page.waitForSelector('.log > input[type=submit]');
        await page.click('.log > input[type=submit]');

        await page.waitForSelector('.navbar-nav');
        await page.goto('https://portal.kaist.ac.kr/index.html');
        await page.waitForSelector('.ptl_search');
        if (lang) {
            await page.goto(`https://portal.kaist.ac.kr/lang/changeLang.face?langKnd=${lang}`);
            await page.waitForSelector('.ptl_search');
        }
        await page.goto('https://portal.kaist.ac.kr/index.html');
        await page.waitForSelector('.ptl_search');
        await page.goto(`https://portal.kaist.ac.kr/board/list.brd?boardId=today_notice&pageSize=${size}`);
        await page.waitForSelector('.req_btn_wrap');
        await page.waitForSelector('.req_tbl_01');
        const result = await page.evaluate(() => {
            const table = document.querySelector<HTMLTableElement>('.req_tbl_01');
            if (table === null) {
                return null;
            }
            const rows = table.querySelectorAll<HTMLTableRowElement>('tr');
            const notices: KaistTodayNotice[] = [];
            rows.forEach((row) => {
                const a = row.querySelector<HTMLAnchorElement>('.req_tit>a');
                const meta = row.querySelectorAll<HTMLLabelElement>('.ellipsis');
                if (a === null) {
                    return;
                }
                if (meta.length !== 4) {
                    return;
                }
                notices.push({
                    title: a.text.trim(),
                    link: a.href,
                    organization: meta[0].innerText.trim(),
                    author: meta[1].innerText.trim(),
                    views: Number(meta[2].innerText.trim()),
                    date: meta[3].innerText.trim(),
                });
            });
            return notices;
        });
        return result?.map((notice) => ({
            ...notice,
            date: normalizeDate(notice.date),
        })) ?? null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
