# Android APK 打包指南（离线打包）

本项目的最终产物是 Android APK。APK 无法在本仓库内直接生成，原因是 DCloud 的
云打包要求账号已登录且完成**实名认证**，而离线打包需要 Android SDK 与 DCloud
离线打包 SDK。本文档把本地出包所需的步骤固定下来，按顺序执行即可。

---

## 前置准备

| 项目 | 说明 |
| --- | --- |
| DCloud AppID | 到 https://dev.dcloud.net.cn 申请，形如 `__UNI__XXXXXXX`。**必需**，否则包跑不起来 |
| Android Studio | 建议 2022 及以上，自带 Android SDK |
| JDK | 8 或 11（离线打包 SDK 对高版本 JDK 支持有限，不建议 17+） |
| DCloud 离线打包 SDK | https://nativesupport.dcloud.net.cn/AppDocs/download/android 下载（需登录） |
| 签名证书 | 见 `offline-package/signing-config.gradle.example` |

---

## 步骤 1：填入真实 AppID

1. 打开 `manifest.json`，把第 3 行的

   ```json
   "appid" : "__UNI__000000",
   ```

   改成你申请到的真实 AppID。

2. 同时确认同文件里 `app-plus.distribute.icons` 引用的图标存在
   （仓库已提供占位图，位于 `unpackage/res/icons/`，建议后续换成正式设计稿）。

---

## 步骤 2：重新编译并生成离线打包资源

```bash
npm install
npm run build:app-plus
node scripts/prepare-offline-package.js
```

执行完成后产物结构为：

```
offline-package/
  assets/
    apps/
      __UNI__XXXXXXX/          <- 目录名 = manifest.json 的 appid
        www/                   <- App 资源（app-service.js / app-view.js / static/ ...）
    data/
      dcloud_control.xml       <- 已按 appid 自动生成
  signing-config.gradle.example
```

> 脚本会自动读取 `manifest.json` 的 appid 并同步到目录名与 `dcloud_control.xml`。
> 若 appid 仍是占位符 `__UNI__000000`，脚本会以退出码 2 结束并给出警告——此时
> 资源包不可用，请先完成步骤 1，再重新执行。
>
> 注意：`offline-package/` 是按需生成的，重新编译后需再次执行脚本刷新。

---

## 步骤 3：解压并打开离线打包工程

1. 解压下载的 Android 离线打包 SDK。
2. 用 Android Studio 打开其中的 `HBuilder-Integrate-AS` 工程。
3. 等待 Gradle Sync 完成。

---

## 步骤 4：放入 App 资源

1. 删除宿主工程原有的示例资源：

   ```
   HBuilder-Integrate-AS/app/src/main/assets/apps/ 下的示例目录
   ```

2. 把本仓库 `offline-package/assets/apps/` 下的整个 `<appid>` 目录拷进去：

   ```
   app/src/main/assets/apps/__UNI__XXXXXXX/www/...
   ```

3. 把 `offline-package/assets/data/dcloud_control.xml` 覆盖到：

   ```
   app/src/main/assets/data/dcloud_control.xml
   ```

4. 打开该文件，确认 `appid` 与目录名、与 `manifest.json` 三者**完全一致**：

   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <HBuilder>
   	<apps>
   		<app appid="__UNI__XXXXXXX" appver=""/>
   	</apps>
   </HBuilder>
   ```

   三处不一致是离线打包失败最常见的原因。

5. `dcloud_properties.xml`（模块配置）保持 SDK 自带内容即可。本项目用到的
   网络请求、本地存储都在基础模块内，无需额外配置。

---

## 步骤 5：配置签名与基本信息

1. 生成 keystore：

   ```bash
   keytool -genkeypair -v \
     -keystore opassistant-release.keystore \
     -alias opassistant \
     -keyalg RSA -keysize 2048 -validity 36500
   ```

2. 按 `offline-package/signing-config.gradle.example` 把 `signingConfigs`
   合并进 `app/build.gradle`。

3. 在 `app/src/main/AndroidManifest.xml` 中确认：
   - `package` / `applicationId` 改成自己的包名
   - 应用名称、图标
   - 本项目需要的权限已包含（`ACCESS_NETWORK_STATE`、`ACCESS_WIFI_STATE`，
     另有联网相关权限 SDK 会自带）

4. 若编译报 minSdk 相关错误，把 `minSdkVersion` 提到 21
   （`manifest.json` 里写的是 19，部分新版 SDK 已不支持）。

---

## 步骤 6：打包

```bash
./gradlew clean assembleRelease
```

产物：

```
app/build/outputs/apk/release/app-release.apk
```

校验签名：

```bash
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

---

## 关于云打包（方案 A）

如果你更想用 HBuilderX 云打包，前提同样是：**HBuilderX 已登录、账号已实名认证、
manifest.json 已填真实 AppID**。之后在 HBuilderX 中
`发行 → 原生App-云打包`，选证书、选正式版，即可拿到 APK。
云打包由 HBuilderX 自行重新编译，不依赖本仓库的 `dist/build/app-plus`。

---

## 已知问题（打包前请知悉）

1. **图表与弹窗运行时不会渲染**：`<l-echart>`、`<uni-popup>` 来自缺失的
   `uni_modules` 目录。`lime-echart` 未发布到 npm，需从 DCloud 插件市场下载；
   `uni-popup` 可通过 `@dcloudio/uni-ui` 获取。补齐前，统计页图表
   和设备列表的新增/编辑弹窗不会有内容。编译本身不受影响。

2. **图标为占位图**：`unpackage/res/icons/` 下的 17 个图标是由脚本生成的占位图
   （主题色底 + 白色圆环），上架前请替换为正式设计稿。重新生成：

   ```bash
   python3 scripts/gen-icons.py
   ```

3. **iOS 打包**：需要 macOS + Xcode，步骤与本文档类似，使用的是
   DCloud iOS 离线打包 SDK。

---

## 相关脚本

| 脚本 | 作用 |
| --- | --- |
| `npm run build:h5` | 编译 H5 版本，用于快速验证代码，产物 `dist/build/h5` |
| `npm run build:app-plus` | 编译 App 资源，产物 `dist/build/app-plus` |
| `node scripts/prepare-offline-package.js` | 生成离线打包目录结构 |
| `python3 scripts/gen-icons.py` | 重新生成占位图标 |
| `scripts/uni-cli-patch.js` | 构建前置补丁，由 npm 脚本自动加载，无需手动执行 |
