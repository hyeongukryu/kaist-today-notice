import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { JSDOM } from 'jsdom';
import { getKaistCookie } from './auth';

export interface KaistTodayNoticeRunOptions {
    id: string;
    password: string;
    generateOtp: () => Promise<string>;
    size?: number;
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

function extractNotices(html: string): KaistTodayNotice[] | null {
    const dom = new JSDOM(html);
    const { document } = dom.window;

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
            link: new URL(a.href, 'https://portal.kaist.ac.kr/').href,
            organization: (meta[0].textContent ?? '').trim(),
            author: (meta[1].textContent ?? '').trim(),
            views: Number((meta[2].textContent ?? '').trim()),
            date: normalizeDate((meta[3].textContent ?? '').trim()),
        });
    });

    return notices;
}

export default async function run(
    options: KaistTodayNoticeRunOptions,
): Promise<KaistTodayNotice[] | null> {
    const {
        id, password, lang, generateOtp,
    } = options;
    const size = options.size ?? 10;

    const cookie = await getKaistCookie({
        userId: id,
        password,
        generateOtp,
    });

    const http = axios.create();
    http.defaults.jar = cookie;
    http.defaults.withCredentials = true;
    wrapper(http);

    await http.get('https://portal.kaist.ac.kr/index.html');
    if (lang) {
        await http.get(`https://portal.kaist.ac.kr/lang/changeLang.face?langKnd=${lang}`);
    }

    const boardPage = await http.get<string>(`https://portal.kaist.ac.kr/board/list.brd?boardId=today_notice&pageSize=${size}`);
    const html = boardPage.data;
    const notices = extractNotices(html);
    return notices;
}
