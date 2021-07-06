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
    size?: number;
    puppeteerLaunchOptions?: PuppeteerLaunchOptions;
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
    return `${digits.substr(0, 4)}-${digits.substr(4, 2)}-${digits.substr(6, 2)}`;
}

export default async function run(
    options: KaistTodayNoticeRunOptions,
): Promise<KaistTodayNotice[] | null> {
    const { id, password, puppeteerLaunchOptions } = options;
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
        const loginMethods = await page.$$<HTMLInputElement>('input[type=submit]');
        await loginMethods[1].click();
        await page.type('input[type=password]', password);
        await page.waitForSelector('.loginbtn');
        await page.click('.loginbtn');
        await page.waitForSelector('.navbar-nav');
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
