
import Crypto from './crypto.js'

const DEVICE_LIST_KEY = 'device_list'
const CURRENT_DEVICE_KEY = 'current_device'

const ERROR_CODES = {
	NETWORK_ERROR: 4000,        
	AUTH_ERROR: 4001,             
	OTHER_ERROR: 4002           
}

class DeviceManager {
	/**
	 * Get device list
	 */
	static getDeviceList() {
		try {
			const deviceList = uni.getStorageSync(DEVICE_LIST_KEY)
			return deviceList || []
		} catch (e) {
			console.error('Failed to get device list:', e)
			return []
		}
	}
	
	/**
	 * Save device list
	 */
	static saveDeviceList(deviceList) {
		try {
			uni.setStorageSync(DEVICE_LIST_KEY, deviceList)
			return true
		} catch (e) {
			console.error('Failed to save device list:', e)
			return false
		}
	}
	
	/**
	 * Generate unique device identifier
	 */
	static generateDeviceId() {
		return Crypto.randomId(16)
	}
	
	/**
	 * Check if device ID already exists
	 */
	static isDeviceExists(deviceId) {
		const deviceList = this.getDeviceList()
		return deviceList.some(device => device.id === deviceId)
	}
	
	/**
	 * Add device
	 */
	static addDevice(device) {
		const deviceList = this.getDeviceList()
		
		const newDevice = {
			...device,
			id: this.generateDeviceId(),
			online: false,
			sysauth: null,
			createTime: new Date().toISOString(),
			password: Crypto.encrypt(device.password)
		}
		deviceList.push(newDevice)
		return this.saveDeviceList(deviceList)
	}
	
	/**
	 * Update device
	 */
	static updateDevice(deviceId, deviceData) {
		const deviceList = this.getDeviceList()
		const index = deviceList.findIndex(device => device.id === deviceId)
		if (index !== -1) {
			const updatedDevice = { ...deviceList[index], ...deviceData }
			if (deviceData.password !== undefined) {
				updatedDevice.password = Crypto.encrypt(deviceData.password)
			}
			deviceList[index] = updatedDevice
			return this.saveDeviceList(deviceList)
		}
		return false
	}
	
	/**
	 * Update device by device ID
	 */
	static updateDeviceById(deviceId, deviceData) {
		const deviceList = this.getDeviceList()
		const index = deviceList.findIndex(device => device.id === deviceId)
		if (index !== -1) {
			const updatedDevice = { ...deviceList[index], ...deviceData }
			if (deviceData.password !== undefined) {
				updatedDevice.password = Crypto.encrypt(deviceData.password)
			}
			deviceList[index] = updatedDevice
			return this.saveDeviceList(deviceList)
		}
		return false
	}
	
	/**
	 * Delete device
	 */
	static deleteDevice(deviceId) {
		const deviceList = this.getDeviceList()
		const filteredList = deviceList.filter(device => device.id !== deviceId)
		return this.saveDeviceList(filteredList)
	}
	
	/**
	 * Get device by ID
	 */
	static getDeviceById(deviceId) {
		const deviceList = this.getDeviceList()
		const device = deviceList.find(device => device.id === deviceId)
		if (device) {
			device.password = Crypto.decrypt(device.password)
		}
		return device
	}
	
	/**
	 * Get device by IP address (kept for compatibility, but not recommended)
	 */
	static getDeviceByIp(ip) {
		const deviceList = this.getDeviceList()
		const device = deviceList.find(device => device.ip === ip)
		if (device) {
			device.password = Crypto.decrypt(device.password)
		}
		return device
	}
	
	/**
	 * Set current device (global)
	 */
	static setCurrentDevice(device) {
		try {
			const deviceToStore = { ...device }
			deviceToStore.password = Crypto.encrypt(device.password)
			uni.setStorageSync(CURRENT_DEVICE_KEY, deviceToStore)
			return true
		} catch (e) {
			console.error('Failed to set current device:', e)
			return false
		}
	}
	

	static getCurrentDevice() {
		try {
			const device = uni.getStorageSync(CURRENT_DEVICE_KEY)
			if (device) {
				device.password = Crypto.decrypt(device.password)
			}
			return device
		} catch (e) {
			console.error('Failed to get current device:', e)
			return null
		}
	}
	

	static clearCurrentDevice() {
		try {
			uni.removeStorageSync(CURRENT_DEVICE_KEY)
			return true
		} catch (e) {
			console.error('Failed to clear current device:', e)
			return false
		}
	}

	static getSysauth(cookieString) {
		if (Array.isArray(cookieString)) {
			cookieString = cookieString.join('; ')
		}
		
		const sysauthMatch = cookieString.match(/sysauth[^=]*=([^;]+)/)
		if (sysauthMatch) {
			return sysauthMatch[1].trim()
		}
		
		return null
	}
	

	static isIPv6(host) {
		return host.includes(':') && (host.split(':').length - 1) >= 2
	}
	

	static formatHostForUrl(host) {
		if (this.isIPv6(host)) {
			return `[${host}]`
		}
		return host
	}

	static loginDevice(device, callback) {
		const protocol = device.useHttps ? 'https' : 'http'
		const formattedHost = this.formatHostForUrl(device.ip)
		const url = `${protocol}://${formattedHost}:${device.port}/ubus`
		const data = {
			jsonrpc: "2.0",
			id: 1,
			method: "call",
			params: [
				"00000000000000000000000000000000", // Temporary session
				"session",
				"login",
				{
					username: device.username,
					password: Crypto.decrypt(device.password)
				}
			]
		}

		uni.request({
			url: url,
			method: 'POST',
			data: data,
			timeout: 3000,
			success: (res) => {
				// Check response status code
				if (res.statusCode === 200) {
					// Check JSON-RPC response
					if (res.data && res.data.result && res.data.result[0] === 0) {
						// Login successful, get session
						const session = res.data.result[1].ubus_rpc_session

						if (session) {
							// Update sysauth in device
							this.updateDeviceById(device.id, {
								sysauth: session,
								online: true
							})

							// Also update current device info
							const updatedDevice = { ...device, sysauth: session, online: true }
							this.setCurrentDevice(updatedDevice)

							// Call success callback
							if (callback) {
								callback({
									success: true,
									sysauth: session
								})
							}
						} else {
							// Call failure callback
							if (callback) {
								callback({
									success: false,
									errorCode: ERROR_CODES.OTHER_ERROR
								})
							}
						}
					} else {
						if (callback) {
							callback({
								success: false,
								errorCode: ERROR_CODES.AUTH_ERROR
							})
						}
					}
				} else {
					// Call failure callback
					if (callback) {
						callback({
							success: false,
							errorCode: ERROR_CODES.NETWORK_ERROR
						})
					}
				}
			},
			fail: (err) => {
				// Call failure callback
				if (callback) {
					callback({
						success: false,
						errorCode: ERROR_CODES.NETWORK_ERROR,
					})
				}
			}
		})
	}
	
	/**
	 * Check device login status and auto login
	 */
	static checkAndLoginDevice(device, callback) {
		if (device.sysauth) {
			if (callback) {
				callback({
					success: true,
					sysauth: device.sysauth
				})
			}
			return
		}

		// No valid sysauth, try to login
		this.loginDevice(device, (loginResult) => {
			if (loginResult.success) {
				if (callback) {
					callback(loginResult)
				}
			} else {
				// Update device offline status
				this.updateDeviceById(device.id, { online: false })
				if (callback) {
					callback({
						success: false,
						errorCode: loginResult.errorCode || ERROR_CODES.OTHER_ERROR
					})
				}
			}
		})
	}
	
	/**
	 * Send authenticated request
	 */
	static async requestWithAuth(device, url, options = {}) {
		try {
			// Check and ensure login status
			const loginResult = await this.checkAndLoginDevice(device)
			if (!loginResult.success) {
				throw new Error(`Login failed with error code: ${loginResult.errorCode}`)
			}
			
			const sysauth = loginResult.sysauth
			
			// Build cookie string
			const cookieString = `sysauth=${sysauth}`
			
			// Send request
			return new Promise((resolve, reject) => {
				uni.request({
					url: url,
					method: options.method || 'GET',
					data: options.data || {},
					timeout: 3000,
					header: {
						'Cookie': cookieString,
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
						...options.header
					},
					success: (res) => {
						resolve(res)
					},
					fail: (err) => {
						reject(err)
					}
				})
			})
		} catch (error) {
			throw error
		}
	}
	
	/**
	 * Initialize test data
	 */
	static initTestData() {
		const testDevices = [
	
		]
		return this.saveDeviceList(testDevices)
	}
	
	/**
	 * Check device connection status
	 */
	static async checkDeviceStatus(device) {
		return new Promise((resolve) => {
			setTimeout(() => {
				const isOnline = Math.random() > 0.3
				resolve(isOnline)
			}, 1000)
		})
	}
	

}

export default DeviceManager 