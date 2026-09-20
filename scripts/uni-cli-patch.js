/**
 * uni-app Vue2 CLI 构建前置补丁（仅构建期使用，不进入 App 产物）。
 *
 * 处理两个问题：
 *
 * 1) uni-app 的 vue-loader 会 `require('@vue/component-compiler-utils')`，
 *    期望拿到它自带的补丁版本（会额外产出 recyclableRender / components）。
 *    但 npm 会把未打补丁的同名包提升到顶层 node_modules，导致模板编译产物里
 *    缺少这两个变量，构建报错：
 *      Module parse failed: Export 'recyclableRender' is not defined
 *    因此把该模块重定向到 uni-app 自带的补丁版本。
 *
 * 2) 构建链里的旧依赖（postcss-urlrewrite 等）使用了 Node 22+ 已移除的
 *    util.isRegExp / util.isArray 等 API，在 Node 24 下会抛
 *    "util.isRegExp is not a function"。这里补回这些兼容函数。
 */
const path = require('path')
const util = require('util')
const moduleAlias = require('module-alias')

const legacyUtil = {
  isArray: Array.isArray,
  isBoolean: (v) => typeof v === 'boolean',
  isBuffer: (v) => Buffer.isBuffer(v),
  isDate: (v) => v instanceof Date,
  isError: (v) => v instanceof Error,
  isFunction: (v) => typeof v === 'function',
  isNull: (v) => v === null,
  isNullOrUndefined: (v) => v == null,
  isNumber: (v) => typeof v === 'number',
  isObject: (v) => v !== null && typeof v === 'object',
  isPrimitive: (v) => v === null || (typeof v !== 'object' && typeof v !== 'function'),
  isRegExp: (v) => v instanceof RegExp,
  isString: (v) => typeof v === 'string',
  isSymbol: (v) => typeof v === 'symbol',
  isUndefined: (v) => v === undefined
}

Object.keys(legacyUtil).forEach((name) => {
  if (typeof util[name] !== 'function') {
    util[name] = legacyUtil[name]
  }
})

moduleAlias.addAlias(
  '@vue/component-compiler-utils',
  path.resolve(
    __dirname,
    '../node_modules/@dcloudio/vue-cli-plugin-uni/packages/@vue/component-compiler-utils'
  )
)
