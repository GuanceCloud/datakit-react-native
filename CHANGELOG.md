# 0.4.0-alpha.1
* 新增 Session Replay 功能
----
# 0.3.3
* 适配 iOS SDK 1.5.3
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
