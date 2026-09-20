/**
 * 整理 Android 离线打包所需的资源目录结构。
 *
 * DCloud 离线打包要求宿主工程的 assets 目录满足：
 *   assets/apps/<appid>/www/     -> App 资源（即 dist/build/app-plus 的内容）
 *   assets/data/dcloud_control.xml
 * 其中 <appid> 目录名必须与 manifest.json 里的 appid 完全一致。
 *
 * 用法：
 *   npm run build:app-plus && node scripts/prepare-offline-package.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'dist', 'build', 'app-plus')
const OUT = path.join(ROOT, 'offline-package')
const PLACEHOLDER_APPID = '__UNI__000000'

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))
const appid = manifest.appid

if (!appid) {
  console.error('manifest.json 中未找到 appid')
  process.exit(1)
}

if (!fs.existsSync(SRC)) {
  console.error('未找到 App 资源包: ' + SRC)
  console.error('请先执行: npm run build:app-plus')
  process.exit(1)
}

const appsDir = path.join(OUT, 'assets', 'apps')
const dataDir = path.join(OUT, 'assets', 'data')
const wwwDir = path.join(appsDir, appid, 'www')

fs.rmSync(appsDir, { recursive: true, force: true })
fs.mkdirSync(wwwDir, { recursive: true })
fs.mkdirSync(dataDir, { recursive: true })

fs.cpSync(SRC, wwwDir, { recursive: true })

const controlXml = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<HBuilder>',
  '\t<apps>',
  '\t\t<app appid="' + appid + '" appver=""/>',
  '\t</apps>',
  '</HBuilder>',
  ''
].join('\n')
fs.writeFileSync(path.join(dataDir, 'dcloud_control.xml'), controlXml, 'utf8')

function countFiles(dir) {
  let n = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1
  }
  return n
}

console.log('AppID            : ' + appid)
console.log('资源来源         : dist/build/app-plus')
console.log('www 目录         : ' + path.relative(ROOT, wwwDir))
console.log('www 文件数       : ' + countFiles(wwwDir))
console.log('控制文件         : ' + path.relative(ROOT, path.join(dataDir, 'dcloud_control.xml')))
console.log('')

if (appid === PLACEHOLDER_APPID) {
  console.error('!! 警告: appid 仍是占位符 ' + PLACEHOLDER_APPID)
  console.error('!! 该资源包无法被 DCloud 运行时加载，必须先在 manifest.json 中')
  console.error('!! 填入 dev.dcloud.net.cn 申请到的真实 AppID，然后重新执行本脚本。')
  process.exit(2)
}

console.log('OK: 离线打包资源目录已就绪')
