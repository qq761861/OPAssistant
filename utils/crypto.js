
import CryptoJS from 'crypto-js'

const ENCRYPTED_PREFIX = 'ENC:'
const KEY_STORAGE_ID = 'app_crypto_key'
const KEY_STORAGE_SALT = 'app_crypto_salt'

class Crypto {

	static getMasterKey() {
		let key = uni.getStorageSync(KEY_STORAGE_ID)
		let salt = uni.getStorageSync(KEY_STORAGE_SALT)

		if (!key || !salt) {
			try {
				const randomWords = CryptoJS.lib.WordArray.random(32)
				key = randomWords.toString(CryptoJS.enc.Hex)
				salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex)
				uni.setStorageSync(KEY_STORAGE_ID, key)
				uni.setStorageSync(KEY_STORAGE_SALT, salt)
			} catch (e) {
				return null
			}
		}
		return { key: key, salt: salt }
	}

	static deriveKey(password, salt) {
		const saltWords = CryptoJS.enc.Hex.parse(salt)
		return CryptoJS.PBKDF2(password, saltWords, {
			keySize: 256 / 32,
			iterations: 10000
		})
	}

	static encrypt(text) {
		if (!text) return ''

		try {
			const master = this.getMasterKey()
			if (!master) {
				return ''
			}

			const derivedKey = this.deriveKey(master.key, master.salt)

			const iv = CryptoJS.lib.WordArray.random(16)

			const encrypted = CryptoJS.AES.encrypt(text, derivedKey, {
				iv: iv,
				mode: CryptoJS.mode.CBC,
				padding: CryptoJS.pad.Pkcs7
			})

			const ivHex = iv.toString(CryptoJS.enc.Hex)
			const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex)

			return ENCRYPTED_PREFIX + ivHex + ciphertextHex
		} catch (e) {
			return ''
		}
	}

	static decrypt(cipher) {
		if (!cipher || !cipher.startsWith(ENCRYPTED_PREFIX)) {
			return cipher
		}

		try {
			const master = this.getMasterKey()
			if (!master) {
				return ''
			}

			const derivedKey = this.deriveKey(master.key, master.salt)

			const encoded = cipher.substring(ENCRYPTED_PREFIX.length)

			const ivHex = encoded.substring(0, 32)
			const ciphertextHex = encoded.substring(32)

			const iv = CryptoJS.enc.Hex.parse(ivHex)
			const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex)

			const cipherParams = CryptoJS.lib.CipherParams.create({
				ciphertext: ciphertext
			})

			const decrypted = CryptoJS.AES.decrypt(
				cipherParams,
				derivedKey,
				{
					iv: iv,
					mode: CryptoJS.mode.CBC,
					padding: CryptoJS.pad.Pkcs7
				}
			)

			return decrypted.toString(CryptoJS.enc.Utf8)
		} catch (e) {
			return ''
		}
	}

	static isEncrypted(text) {
		return text && text.startsWith(ENCRYPTED_PREFIX)
	}

	static randomId(length = 16) {
		try {
			return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex)
		} catch (e) {
			return Date.now().toString(36) + Math.random().toString(36).substr(2)
		}
	}
}

export default Crypto;
