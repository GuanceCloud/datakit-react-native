# 0.3.12
* 新增 RUM `Resource` 数据字段 `resource_first_byte_time`、`resource_dns_time`、`resource_download_time`、`resource_connect_time`、`resource_ssl_time`、`resource_redirect_time`，支持在观测云上 Resource 耗时增强展示，并在支持「应用性能监测」火焰图对齐时间轴
* `FTMobileConfig.enableDataIntegerCompatible` 默认开启
* 适配 Android ft-sdk 1.6.9， iOS 1.5.12、1.5.13、1.5.14

---
# 0.3.12-alpha.1
* Android 适配 1.6.9-beta02 版本

---
# 0.3.11
* 原生 与 React Native 混合开发 SDK 配置优化
  * 支持通过 `FTRumActionTracking.startTracking()` 方法，自动采集 React Native 控件点击事件，`FTRumErrorTracking.startTracking()` 方法，自动采集 React Native 错误日志
  * 开启 RUM Resource 自动采集时，新增方法 iOS 端 `FTReactNativeUtils.filterBlackResource(url)`、Android 端 `ReactNativeUtils.isReactNativeDevUrl(url)` 过滤开发环境中的 React Native 符号化请求及 Expo 日志请求，减少冗余数据
* 适配 iOS SDK 1.5.11
---
# 0.3.10
* 修改 iOS bridge 代码中引用 native SDK 头文件方式
* 新增 RUM 条目数量限制功能、支持通过 `FTRUMConfig.rumCacheLimitCount` 来限制 SDK 最大缓存条目数据限制，
  支持通过 `FTRUMConfig.rumDiscardStrategy` 设置来指定丢弃新数据或丢弃旧数据
* 新增支持通过 `FTMobileConfig.enableLimitWithDbSize` 限制总缓存大小功能，开启之后
   `FTLoggerConfig.logCacheLimitCount` 及 `FTRUMConfig.rumCacheLimitCount` 将失效，
   支持通过 `FTMobileConfig.dbDiscardStrategy` 设置 db 废弃策略，支持通过 `FTMobileConfig.dbCacheLimit` 设置 db 缓存限制大小
* 适配 iOS SDK 1.5.10，Android SDK ft-sdk 1.6.8
---
# 0.3.10-alpha.1
* 修改 iOS bridge 代码中引用 native SDK 头文件方式
* 新增 RUM 条目数量限制功能、支持通过 `FTRUMConfig.rumCacheLimitCount` 来限制 SDK 最大缓存条目数据限制，
  支持通过 `FTRUMConfig.rumDiscardStrategy` 设置来指定丢弃新数据或丢弃旧数据
* 新增支持通过 `FTMobileConfig.enableLimitWithDbSize` 限制总缓存大小功能，开启之后
   `FTLoggerConfig.logCacheLimitCount` 及 `FTRUMConfig.rumCacheLimitCount` 将失效，
   支持通过 `FTMobileConfig.dbDiscardStrategy` 设置 db 废弃策略，支持通过 `FTMobileConfig.dbCacheLimit` 设置 db 缓存限制大小
* 适配 iOS SDK 1.5.9，Android SDK ft-sdk 1.6.7
---
# 0.3.9
* 为提升 React Android 兼容性，更改 Android React Native Bridge 部分由 Kotlin 语言为 Java
* 适配 Android SDK ft-sdk 1.6.5
  * 弱化 Webview 在 AOP 过程中参数为 null 的提示
  * 优化应用在后台长 Session 更新的机制
---
# 0.3.8-beta.1
* 同 0.3.8-alpha.2

---
# 0.3.8-alpha.2
* 为提升 React Android 兼容性，更改 Android React Native Bridge 部分由 Kotlin 语言为 Java

---
# 0.3.8-alpha.1
* Android React Native AGP 高版本混合项目兼容适配

---
# 0.3.7
* 修正 Android RN 错误数据类型标注错误的问题
* 支持通过 `FTRUMConfig.nativeFreezeDurationMs` 设置卡顿检测阀值
* 支持使用 `FTMobileConfig.compressIntakeRequests` 对同步数据进行 `deflate` 压缩配置
* 适配 iOS SDK 1.5.6
  * 支持使用 `FTMobileConfig.compressIntakeRequests` 对同步数据进行 `deflate` 压缩配置
  * RUM 添加 `addAction:actionType:property` 与 `startAction:actionType:property:` 方法，优化 RUM Action 采集逻辑
  * 修复使用 `NSFileHandle` 废弃 api 导致的崩溃问题
* 适配 iOS SDK 1.5.7
  * 支持通过 `FTRUMConfig.freezeDurationMs` 设置卡顿检测阀值
  * 优化 SDK 的 `shutDown` 方法，避免主线程同步等待导致的卡顿或 WatchDog 崩溃
* 适配 Android SDK ft-sdk 1.6.2
  * RUM 新增 `addAction` 方法，支持 property 扩展属性与频繁连续数据上报
* 适配 Android SDK ft-sdk 1.6.3
  * 优化自定义 `addAction` 在高频率调用时的性能表现
  * 支持使用  `FTSDKConfig.setCompressIntakeRequests` 对同步数据进行 `deflate` 压缩配置
* 适配 Android SDK ft-sdk 1.6.4
  * 优化 App 启动时间在 API 24 以上统计时间
  * 支持通过 `FTRUMConfig.setEnableTrackAppUIBlock(true, blockDurationMs)` 设置检测时间范围
----
# 0.3.6
* 适配 iOS SDK 1.5.5
  * 修复 `FTResourceMetricsModel` 中数组越界导致的崩溃问题
----
# 0.3.5
* 支持采集 Native Error、ANR、Freeze
* 修改 react-native 自动采集 error 的默认错误类型
* 对拥有 `onPress` 属性的组件，新增支持在开启 `enableAutoTrackUserAction` 后通过添加自定义属性
  `ft-enable-track` 定义是否采集该组件的点击事件、通过 `ft-extra-property` 添加 Action 额外属性
----
# 0.3.4
* addError 添加自定错误类型
* 支持全局动态添加 globalContext 属性
* 支持通过 FTMobileReactNative.shutDown() 关闭 SDK
* 支持通过 FTMobileReactNative.clearAllData() 清理 SDK 数据
* 修复自动采集 react-native Error 时，参数 `stack` 与 `message` 赋值相反问题
* 适配 Android SDK ft-sdk 1.6.1
  * 修复 RUM 单独调用自定义 startView，导致监控指标 FTMetricsMTR 线程未被回收的问题
	* 支持通过 FTSdk.appendGlobalContext(globalContext)、FTSdk.appendRUMGlobalContext(globalContext)、
   		 FTSdk.appendLogGlobalContext(globalContext)添加动态属性
	*	支持通过 FTSdk.clearAllData() 清理未上报缓存数据
* 适配 iOS SDK 1.5.4
  * 添加全局、log、RUM globalContext 属性动态设置方式
  * 添加清除数据方法，支持删除所有尚未上传至服务器的数据
  * 调整同步间歇支持的最大时间间隔至 5000 毫秒
----
# 0.3.4-alpha.3
* 支持通过 FTMobileReactNative.shutDown() 关闭 SDK
* 支持通过 FTMobileReactNative.clearAllData() 清理 SDK 数据

----
# 0.3.4-alpha.2
* addError 添加自定错误类型
* 支持全局动态添加 globalContext 属性
* 适配 Android SDK ft-sdk 1.6.1-alpha04
  * 修复 RUM 单独调用自定义 startView，导致监控指标 FTMetricsMTR 线程未被回收的问题
  * 添加全局、log、RUM globalContext 属性动态设置方式
* 适配 iOS SDK 1.5.4.alpha.2
  * 添加全局、log、RUM globalContext 属性动态设置方式

----
# 0.3.3
* 适配 iOS SDK 1.5.3
----
# 0.3.2-hotfix.1
* 适配 iOS SDK 1.5.2-hotfix.1
  * 修复 `FTResourceMetricsModel` 中数组越界崩溃的问题
----
# 0.3.2
* 修复 Android 配置 `FTMobileConfig.env` 无效问题
----
# 0.3.1
* 适配 iOS SDK 1.5.2
* 兼容修复 React 版本低于 16.14.0 时使用 `react/jsx-runtime` 报错
* Android 兼容 react native 0.63 低版本
* 修改过滤指向本地主机（localhost）URL 的正则表达式，增加匹配范围
----
# 0.3.1-alpha.4
* 修复 `replace-react-require.js` 文件未找到问题
-----
# 0.3.1-alpha.3
* 兼容修复 React 版本低于 16.14.0 时使用 `react/jsx-runtime` 报错
-----
# 0.3.1-alpha.2
* Android 兼容 react native 0.63 低版本

-----
# 0.3.0
* 新增支持数据同步参数配置，请求条目数据，同步间歇时间，以及日志缓存条目数
* RUM resource 网络请求添加 remote ip 地址解析功能
* 添加行协议 Integer 数据兼容模式，处理 web 数据类型冲突问题
* 日志添加自定义 status 方法
* react-native 采集 action 方法修改，适配 React 17 无法从 React.createElement 拦截点击事件问题
* 在 Debug 场景下，RUM Resource 采集过滤掉指向本地主机（localhost）的热更新连接
* 修正 Android 底层 Double 适配问题
-----
# 0.3.0-alpha.2
* Android 兼容 react native 0.63 低版本

-----
# 0.3.0-beta.2
* 在 Debug 场景下，RUM Resource 采集过滤掉指向本地主机（localhost）的热更新连接
* 修正 Android 底层 Double 适配问题
-----
# 0.3.0-beta.1
* 同 0.3.0-alpha.1
-----
# 0.3.0-alpha.1
* 新增支持数据同步参数配置，请求条目数据，同步间歇时间，以及日志缓存条目数
* RUM resource 网络请求添加 remote ip 地址解析功能
* 添加行协议 Integer 数据兼容模式，处理 web 数据类型冲突问题
* 日志添加自定义 status 方法
* react-native 采集 action 方法修改，适配 React 17 无法从 React.createElement 拦截点击事件问题

-----
# 0.2.9-beta.2
* 调整 调整 peerDependencies 限制

-----
# 0.2.9-beta.1
* 适配 iOS SDK 1.5.1
* 适配 Android ft-sdk 1.5.2, ft-native 1.1.1, ft-plugin-legacy 1.1.7

-----
# 0.2.8
* 适配 iOS SDK 1.4.9-beta.4
* 适配 Android 1.4.1-beta01
* 新增 dataway 上传方式
-----
# 0.2.7
* 适配 iOS SDK 1.4.7-beta.1
* 适配 Android 1.3.16-beta02
* 新增 env 字符自定义模式
-----
# 0.2.6
* 适配 iOS SDK 1.4.3-beta.1
* 适配 android agent 1.3.12-beta01
* 添加 SDK 版本字段 sdk_package_reactnative

-----
# 0.2.5
* 适配 iOS SDK 1.4.1-alpha.3
* 适配 android ft-plugin-legacy 1.1.4-beta02
* 适配 android agent 1.3.11-beta02
* 适配 android native 1.0.0-beta01

-----
# 0.2.4
* 修正设备指标监控传参错误

-----
# 0.2.3
* 适配 iOS SDK 1.3.10-beta.1
* 适配 Android 1.3.9-beta02

-----
# 0.2.2
* Android Native SDK 调整

-----
# 0.2.1
* demo 修改
* Native SDK 调整

-----
# 0.2.0
* startView 参数优化
* 添加 onCreateView 方法

-----
# 0.1.1
* Android 调用方法修正
* 兼容性适配
