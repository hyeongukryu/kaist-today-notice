export interface KaistTodayNoticeFetchOptions {
    cookie: string;
    size?: number;
    lang?: 'ko' | 'en';
}

export interface KaistTodayNotice {
    title: string;
    url: string;
    loginUrl: string;
    organization: string;
    author: string;
    views: number;
    timestamp: string;
}

export interface KaistBoard {
    boardId: number;
    menuId: number;
    menuPath: string;
}

async function getBoards(cookie: string): Promise<KaistBoard[]> {
    const response = await fetch(
        'https://portal.kaist.ac.kr/wz/api/widget/tabBoard/divide',
        { headers: { cookie } },
    );
    const json = await response.json();
    const { boardAll } = json.data;
    return boardAll.map((board: any) => ({
        boardId: board.boardNo,
        menuId: board.menuNo,
        menuPath: board.menuPath,
    }));
}

export async function fetchPosts(
    options: KaistTodayNoticeFetchOptions,
): Promise<KaistTodayNotice[] | null> {
    const size = options.size ?? 10;
    const lang = options.lang ?? 'ko';

    const boards = await getBoards(options.cookie);
    const getBoard = (boardId: number) => boards.find((board) => board.boardId === boardId);

    const url = new URL('/wz/api/board/recents', 'https://portal.kaist.ac.kr/');
    url.searchParams.append('recordCountPerPage', size.toString());
    url.searchParams.append('lang', lang);

    const response = await fetch(
        url,
        { headers: { cookie: options.cookie } },
    );
    const json = await response.json();
    const { data } = json;

    const posts: KaistTodayNotice[] = [];
    for (let i = 0; i < data.length; i += 1) {
        const post = data[i];

        const title = post.pstTtl ?? '';
        const organization = post.pstWrtrDeptNm ?? '';
        const author = post.pstWrtrNm ?? '';
        const views = post.inqCnt ?? 0;
        const timestamp = (post.regDt ?? '').replaceAll('.', '-');

        const board = getBoard(post.boardNo);
        if (!board) {
            throw new Error('Invalid boardNo');
        }
        const postPath = `${board.menuPath}#${post.pstNo}`;
        const postUrl = new URL(postPath, 'https://portal.kaist.ac.kr/');
        const loginUrl = new URL('https://portal.kaist.ac.kr/common/login/login.do');
        loginUrl.searchParams.append('returnUrl', postPath);

        posts.push({
            title,
            url: postUrl.toString(),
            loginUrl: loginUrl.toString(),
            organization,
            author,
            views,
            timestamp,
        });
    }

    return posts;
}
