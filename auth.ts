import axios, { AxiosError } from 'axios';
import {
    pki, util, random, pkcs5, md, cipher,
} from 'node-forge';
import { CookieJar, MemoryCookieStore } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { JSDOM } from 'jsdom';

const cookieStore = new MemoryCookieStore();
const cookieJar = new CookieJar(cookieStore);

const http = axios.create();
http.defaults.baseURL = 'https://iam2.kaist.ac.kr';
http.defaults.withCredentials = true;
http.defaults.jar = cookieJar;
wrapper(http);
http.interceptors.request.use((config) => {
    const token = cookieJar
        .getCookiesSync('https://iam2.kaist.ac.kr')
        .find((cookie) => cookie.key === 'XSRF-TOKEN')?.value;
    if (token) {
        // eslint-disable-next-line no-param-reassign
        config.headers['X-XSRF-TOKEN'] = token;
    }
    return config;
});

async function getPublicKey(): Promise<string> {
    await http.get('/'); // XSRF-TOKEN
    const result = await http.post<string>('getPublicKey');
    return result.data;
}

interface SymmetricKey {
    length: number;
    key: string;
    iv: string;
    keyStr: string;
}

function generateSymmetricKey(): SymmetricKey {
    const length = 32;
    const entropy = util.encode64(random.getBytesSync(0x40));
    const password = `${entropy.substring(0x0, 0x4)
    }b${entropy.substring(0x5, 0x9)
    }a${entropy.substring(0xa, 0xe)
    }n${entropy.substring(0xf, 0x13)
    }d${entropy.substring(0x14, 0x18)
    }i${entropy.substring(0x19)}`;
    const salt = password.substring(password.length - 16);
    const pbkdf2 = pkcs5.pbkdf2(password, salt, 1024, length);
    const iv = pbkdf2.slice(pbkdf2.length - 16);
    return {
        length,
        key: pbkdf2,
        iv,
        keyStr: password,
    };
}

function encryptPKIWithPublicKey(payload: string, publicKey: pki.rsa.PublicKey): string {
    const encoded = util.encodeUtf8(payload);
    const encrypted = publicKey.encrypt(encoded, 'RSAES-PKCS1-V1_5', { md: md.sha256.create() });
    return util.encode64(encrypted);
}

function encryptAES(paylod: string, keyInfo: SymmetricKey): string {
    const encoded = encodeURIComponent(paylod);
    const aes = cipher.createCipher('AES-CBC', keyInfo.key);
    aes.start({ iv: keyInfo.iv });
    aes.update(util.createBuffer(encoded));
    aes.finish();
    return util.encode64(aes.output.bytes());
}

function encryptPayloadComponent(
    payload: string | null | undefined,
    keyInfo: SymmetricKey,
): string | null {
    if (payload === null || payload === undefined) {
        return null;
    }
    if (payload === '') {
        return '';
    }
    return encryptAES(payload, keyInfo);
}

interface CryptoConfiguration {
    keyInfo: SymmetricKey;
    encKey: string;
}

async function loginIdPassword(
    userId: string,
    password: string,
    cryptoConfig: CryptoConfiguration,
) {
    const encryptedUserId = encryptPayloadComponent(userId, cryptoConfig.keyInfo);
    const encryptedPassword = encryptPayloadComponent(password, cryptoConfig.keyInfo);
    if (encryptedUserId === null || encryptedPassword === null) {
        throw new Error('Invalid input');
    }
    const formData = {
        user_id: encryptedUserId,
        login_page: 'L_P_IAMPS',
        pw: encryptedPassword,
    };
    const body = new URLSearchParams(formData);
    try {
        await http.post('/api/sso/login', body, { headers: { encsymka: cryptoConfig.encKey } });
    } catch (e) {
        if (!axios.isAxiosError(e)) {
            throw e;
        }
        const error = e as AxiosError<any>;
        const { response } = error;
        if (!response || response.status !== 500 || !response.data) {
            throw e;
        }
        if (typeof response.data.errorCode !== 'string') {
            throw e;
        }
        if (response.data.errorCode !== 'SSO_OTP_NEED_OTP_CHECK') {
            throw Error(response.data.errorCode);
        }
    }
}

async function loginOtp(userId: string, otp: string, cryptoConfig: CryptoConfiguration) {
    const encryptedUserId = encryptPayloadComponent(userId, cryptoConfig.keyInfo);
    if (encryptedUserId === null) {
        throw new Error('Invalid input');
    }
    const formData = {
        user_id: encryptedUserId,
        login_page: 'L_P_IAMPS',
        otp,
        param_id: '',
        auth_type_2nd: 'motp',
        alrdln: 'T',
    };
    const body = new URLSearchParams(formData);
    await http.post('/api/sso/login', body, { headers: { encsymka: cryptoConfig.encKey } });
}

function generateCryptoConfig(publicKey: pki.rsa.PublicKey): CryptoConfiguration {
    const symmetricKey = generateSymmetricKey();
    const encsymka = encryptPKIWithPublicKey(symmetricKey.keyStr, publicKey);
    return {
        keyInfo: symmetricKey,
        encKey: encsymka,
    };
}

export interface GetKaistCookieRunOptions {
    userId: string;
    password: string;
    generateOtp: () => Promise<string>;
}

export async function loginToPortal() {
    const redirectPage = await http.get('https://portal.kaist.ac.kr/user/ssoLoginProcess.face');
    const html = redirectPage.data;
    const dom = new JSDOM(html);
    const { document } = dom.window;
    const action = document.querySelector('form')?.action;
    if (!action || !action.startsWith('https://portal.kaist.ac.kr/')) {
        throw new Error('Invalid action');
    }
    const inputElements = document.querySelectorAll('input[type="hidden"]');
    const formData = new URLSearchParams();
    inputElements.forEach((input) => {
        const name = input.getAttribute('name');
        const value = input.getAttribute('value');
        if (name && value) {
            formData.append(name, value);
        }
    });
    await http.post(action, formData);
    await http.get('https://portal.kaist.ac.kr/index.html');
}

export async function getKaistCookie(options: GetKaistCookieRunOptions): Promise<CookieJar> {
    const { userId, password, generateOtp } = options;
    const serverPublicKey = await getPublicKey();
    const publicKey = pki.publicKeyFromPem(`-----BEGIN PUBLIC KEY-----\n${serverPublicKey}\n-----END PUBLIC KEY-----`);
    await loginIdPassword(userId, password, generateCryptoConfig(publicKey));
    const otp = await generateOtp();
    await loginOtp(userId, otp, generateCryptoConfig(publicKey));
    await loginToPortal();
    return cookieJar;
}
