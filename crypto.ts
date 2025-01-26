import { KISA_SEED_CBC } from 'kisa-seed';

export interface KaistKey {
    key: string;
    iv: string;
}

function hexToUint8Array(hex: string): Uint8Array {
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return array;
}

export function encrypt(text: string, key: KaistKey) {
    const plainBytes = new Uint8Array(Buffer.from(text, 'utf-8'));
    const encryptedBytes = KISA_SEED_CBC.SEED_CBC_Encrypt(
        hexToUint8Array(key.key),
        hexToUint8Array(key.iv),
        plainBytes,
        0,
        plainBytes.length,
    );
    let encryptedText = '';
    for (let i = 0; i < encryptedBytes.length; i += 1) {
        const hex = encryptedBytes[i].toString(16);
        encryptedText += hex.padStart(2, '0');
    }
    return encryptedText;
}
