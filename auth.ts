import axios from 'axios';
import { CookieJar, MemoryCookieStore } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { JSDOM } from 'jsdom';
import { encrypt, KaistKey } from './crypto';

const cookieStore = new MemoryCookieStore();
const cookieJar = new CookieJar(cookieStore);

const http = axios.create();
http.defaults.baseURL = 'https://sso.kaist.ac.kr/';
http.defaults.withCredentials = true;
http.defaults.jar = cookieJar;
wrapper(http);

async function getKey(): Promise<KaistKey> {
    const formData = new URLSearchParams();
    formData.append('agt_id', 'kaist-prod-portal');
    formData.append('agt_url', 'https://portal.kaist.ac.kr');
    formData.append('user_id', '');
    await http.get(`/auth/kaist/user/login/view?${formData.toString()}`);

    const result = await http.post('/auth/user/login/init');
    const { data } = result;
    if (data.result_code !== 'SS0001') {
        throw new Error('Invalid init response');
    }
    if (typeof data.result_data !== 'string' || data.result_data.length !== 160) {
        throw new Error('Invalid key length');
    }
    const key = data.result_data.substring(0, 64);
    const iv = data.result_data.substring(64);
    return { key, iv };
}

async function loginUsingPassword(username: string, password: string) {
    const request = {
        login_id: username,
        login_pwd: password,
        agt_id: 'kaist-prod-portal',
        linkUrl: '/user/login/link',
        device_cd: [],
    };
    const payload = JSON.stringify(request);
    const key = await getKey();
    const userData = encrypt(payload, key);

    const formData = new URLSearchParams();
    formData.append('user_data', userData);
    const result = await http.post('/auth/user/login/auth', formData.toString());
    if (result.data.code !== 'SS0098') {
        throw new Error('Invalid login response');
    }
}

async function secondFactorPage() {
    const formData = new URLSearchParams();
    formData.append('user_gubun', 'user');
    formData.append('linkUrl', '/user/login/link');
    await http.post('/auth/kaist/user/login/second/view', formData.toString());
}

async function selectEmailOtp() {
    const result = await http.post('/auth/kaist/user/login/second/ajaxSendMail');
    if (result.data.errorCode !== 'SS0001') {
        throw new Error('Invalid email otp response');
    }
}

async function submitOtp(otp: string) {
    const formData = new URLSearchParams();
    formData.append('crtfc_no', otp);

    const result = await http.post('/auth/kaist/user/login/second/ajaxValidCrtfcNo', formData.toString());
    if (result.data.code !== 'SS0099') {
        throw new Error('Invalid otp submit response');
    }
}

async function completeLogin(): Promise<string> {
    const result = await http.post('/auth/kaist/user/device/login');
    if (!result.data.includes("'로그인이 완료되었습니다. 화면을 종료해 주시기 바랍니다.'")) {
        throw new Error('Invalid login result');
    }

    const dom = new JSDOM(result.data);
    const { document } = dom.window;
    const ssoCode = [...document.querySelectorAll('input')]
        .filter((e) => e.getAttribute('name') === 'sso_code').at(0)?.value;
    if (!ssoCode || ssoCode.length !== 32) {
        throw new Error('Invalid sso code');
    }
    return ssoCode;
}

async function loginToPortal(ssoCode: string) {
    const formData = new URLSearchParams();
    formData.append('sso_code', ssoCode);
    const callbackResult = await http.post('https://portal.kaist.ac.kr/passni5/login_proc.jsp', formData.toString());
    if (!callbackResult.data.includes("var errCode = '';")) {
        throw new Error('Invalid portal result');
    }

    const rootResult = await http.get('https://portal.kaist.ac.kr/common/login/login.do?returnUrl=/');
    if (!rootResult.data.includes('var pni_token =')) {
        throw new Error('Invalid return result');
    }
}

export async function login(
    username: string,
    password: string,
    getOtp: () => Promise<string>,
): Promise<string> {
    await cookieJar.removeAllCookies();

    await loginUsingPassword(username, password);
    await secondFactorPage();
    await selectEmailOtp();
    const otp = await getOtp();
    await submitOtp(otp);
    const ssoCode = await completeLogin();
    await loginToPortal(ssoCode);

    return cookieJar.getCookieStringSync('https://portal.kaist.ac.kr');
}

export async function loginWithRetry(
    username: string,
    password: string,
    getOtp: () => Promise<string>,
): ReturnType<typeof login> {
    const backoffSeconds = [15, 30, 30, 60, 60];
    const getJitter = () => Math.random() * 15;

    for (; ;) {
        try {
            // eslint-disable-next-line no-await-in-loop
            return await login(username, password, getOtp);
        } catch (e) {
            if (backoffSeconds.length === 0) {
                throw e;
            }
            const delay = backoffSeconds.shift()! + getJitter();
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => { setTimeout(resolve, delay * 1000); });
        }
    }
}
