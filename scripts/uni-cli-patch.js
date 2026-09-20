/**
 * uni-app Vue2 CLI 构建前置补丁。
 *
 * 背景：uni-app 的 vue-loader 会 `require('@vue/component-compiler-utils')`，
 * 期望拿到它自带的补丁版本（会额外产出 recyclableRender / components）。
 * 但 npm 会把未打补丁的同名包提升到顶层 node_modules，导致模板编译产物里
 * 缺少这两个变量，构建报错：
 *   Module parse failed: Export 'recyclableRender' is not defined
 *
 * 因此在加载 vue-cli-service 之前，把该模块重定向到 uni-app 自带的补丁版本。
 */
const path = require('path')
const moduleAlias = require('module-alias')

moduleAlias.addAlias(
  '@vue/component-compiler-utils',
  path.resolve(
    __dirname,
    '../node_modules/@dcloudio/vue-cli-plugin-uni/packages/@vue/component-compiler-utils'
  )
)
