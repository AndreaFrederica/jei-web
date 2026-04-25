# About

## Build
- Version: pages-build-13-g2f7e471-dirty
- Commit: 2f7e471 (2f7e4718ae873be674b017508e2d952a81a942ae)
- Commit count: 171
- Subject: fix: 重置规划器状态以解决加载保存计划时的潜在问题
- Author: AndreaFrederica
- Date: 2026-04-22T05:34:32+08:00
- Generated at: 2026-04-24T16:57:08.539Z
- Remote: https://github.com/AndreaFrederica/jei-web.git

## Version History

### Unreleased (2026-04-22T05:34:32+08:00)
- 2f7e471 2026-04-22T05:34:32+08:00
  fix: 重置规划器状态以解决加载保存计划时的潜在问题
- b321ce1 2026-04-22T05:03:48+08:00
  feat: Enhance planner tab with settings and embedded mode
  
  - Added a settings button to the planner tab for configuring planner modes.
  - Introduced a dialog for planner settings, allowing users to switch between 'advanced' and 'classic' modes.
  - Updated the RecipeContentView to conditionally render the appropriate planner based on the selected mode.
  - Created a new component for adding targets in the advanced planner.
  - Enhanced various advanced planner components to emit item click events for better interactivity.
  - Improved UI elements for better user experience, including collapsible sections and dynamic labels based on context.
- 3ec72c6 2026-04-22T03:59:03+08:00
  feat(planner): add advanced planner views and state management
  
  - Implemented `useAdvancedPlannerQuantView` for quantitative flow modeling.
  - Created `useAdvancedPlannerSummaryView` to summarize item and fluid totals.
  - Developed `useAdvancedPlannerTreeView` for hierarchical tree representation of planner nodes.
  - Added `useAdvancedPlannerViewState` for managing view state across different planner components.
  - Enhanced utility functions for handling node positions and formatting amounts.
- e918ef7 2026-04-21T05:03:11+08:00
  Refactor code structure for improved readability and maintainability
- 8132061 2026-04-21T04:18:57+08:00
  fix: 修复LP规划器的大量逻辑bug 发现classic给规划器在新版本存在大量无法正常规划的bug
- 0766d0c 2026-04-18T01:10:33+08:00
  feat: 添加Warfarin Wiki的备用镜像链接
- 5b47dff 2026-04-08T04:10:11+08:00
  fix(ui): 优化移动端布局并修复标签页溢出问题
  
  - 为移动端隐藏键盘快捷键提示，避免标签文字过长
  - 动态设置标签页箭头显示，改善移动端导航体验
  - 添加 CSS 类限制容器最小宽度，防止内容溢出
  - 在 CraftingPlannerView 中适配移动端布局，调整工具栏响应式设计
- 77b407c 2026-04-08T03:35:36+08:00
  feat: 新增配方数据源追踪和移动端界面优化
  
  - 在配方类型中增加 sourcePackIds 字段以追踪数据来源
  - 为物品查询添加 aggregateHoverSources 支持，增强跨数据包匹配
  - 新增配方查询数据源显示开关，可在设置中控制是否显示配方来源标签
  - 优化移动端底部数据源栏，支持折叠功能并改进布局适配
  - 重构 Wiki 组件，支持基于数据源的物品解析和导航
  - 新增构建信息对话框，集中展示版本和构建详情
  - 改进 Warfarin 配方渲染器，优化配方表格布局和显示效果
  - 更新多语言翻译，添加相关设置项和界面文本
- 5b64e25 2026-04-07T20:22:18+08:00
  feat: 添加基于域名的UI策略和移动端适配
  
  - 根据访问域名动态调整QQ群相关UI显示（隐藏链接、过滤敏感文本）
  - 为设置对话框添加移动端适配，支持全屏显示和响应式布局
  - 增强QQ群弹窗的配置选项，支持自定义按钮文本和显示模式
  - 修复静态资源服务脚本路径问题
  - 更新关于页面版本信息
  - 优化长字符串的代码格式以提高可读性
- 2baa357 2026-04-03T17:47:37+08:00
  feat: 增加相对路径服务脚本，优化静态资源加载
- 579f1fe 2026-04-03T17:08:02+08:00
  feat: enhance app path handling and improve static serving
  
  - Added `appPath` utility to normalize asset paths based on the base URL.
  - Introduced `packBasePath` function for generating pack asset URLs.
  - Updated various components and pages to utilize the new path utilities for fetching assets.
  - Implemented a new static server script to serve files from a specified directory with CORS support.
  - Modified build configuration to set public path for assets.
  - Enhanced loading components to dynamically reference asset paths.
  - Updated the about documentation with the latest build information and commit history.
- 892363d 2026-04-03T02:03:35+08:00
  feat: add first-use setup wizard and related settings
  
  - Implemented a setup wizard dialog to guide users through initial configurations.
  - Added translations for the setup wizard in English, Japanese, and Simplified Chinese.
  - Integrated setup wizard options into the main layout and settings dialog.
  - Created a new store for managing pack options.
  - Enhanced settings store to track completion status of the setup wizard.
  - Updated dialog manager to handle the setup wizard dialog.
  - Added functionality to open the setup wizard from settings.
- 0f05f4a 2026-04-03T01:15:16+08:00
  feat: 添加移动端点击物品后自动切换到详情页的设置选项

### pages-build (2026-04-03T00:33:28+08:00)
- ccec8d3 2026-04-03T00:33:28+08:00
  feat: 添加 Release Pages Build 工作流，支持自动构建和发布页面构件
- f253217 2026-04-02T01:47:25+08:00
  feat: 增加 JEI Classic 模式下历史记录数量的动态调整，优化历史记录显示
- cf92aa5 2026-04-02T01:43:15+08:00
  feat: 添加物品图标加载动画和点击物品默认打开选项，更新设置对话框
- 6e5c050 2026-04-02T00:15:00+08:00
  fix: 优化 SettingsDialog 组件中的文本格式和事件处理
- a41ed6c 2026-04-01T22:02:19+08:00
  feat: 添加 AEF 聚合完整数据支持，更新设置对话框样式和布局
- 11816e7 2026-04-01T20:32:05+08:00
  feat: 优化 WarfarinEndpointRenderer 组件，简化代码结构并增强可读性
- 297438f 2026-04-01T20:31:50+08:00
  feat: 更新 WInfoGrid 组件，增强样式和响应式布局
- 1d6581e 2026-04-01T17:54:48+08:00
  feat: 增强悬浮提示功能，添加可配置的显示选项和预览功能
- 82ae7d2 2026-04-01T05:25:43+08:00
  feat: add AEF aggregation logic and enhance wiki components
  
  - Implemented `aggregateAefPack` function to aggregate items from AEF and AEF-Skland packs based on unique names.
  - Enhanced `WikiDocument.vue` to conditionally hide leading horizontal rules based on a new prop.
  - Introduced `LinkInline.vue` component for rendering inline links in wiki documents.
  - Updated `WikiInlineElement.vue` to support rendering of link elements.
  - Improved `EntryInline.vue` with dark mode support and styling adjustments.
  - Modified `WikiWidgetCommon.vue` to handle display titles and conditional rendering of document components.
  - Added aggregate merge report functionality in `IndexPage.vue` with copy and download options.
  - Updated `SettingsDialog.vue` to include buttons for exporting aggregate merge analysis.
  - Extended `InlineElement` type in `wiki.ts` to include `LinkInline` type for better type safety.
- 27987df 2026-04-01T04:34:42+08:00
  feat: 优化 WItemCostGrid 组件，调整成本显示样式并增强 StackView 组件的工具提示功能
- c505292 2026-04-01T04:22:36+08:00
  feat: 添加 itemDefsByKeyHash 属性到 WItemCostGrid 组件，增强物品成本显示
- 2c9d209 2026-04-01T04:09:46+08:00
  feat: add hover tooltip interaction settings and keybinding
  
  - Introduced a new setting to allow mouse enter for hover tooltips in the settings dialog.
  - Added a keybinding for interacting with hover tooltips, including handling keydown and keyup events.
  - Updated relevant components to support the new hover tooltip interaction feature.
  - Refactored item search logic to accommodate changes in item ID handling.
  - Enhanced settings store to manage new hover tooltip settings and their persistence.
- 17561c5 2026-03-31T22:48:36+08:00
  feat: 更新单位处理逻辑，统一使用 PlannerTargetUnit 类型
- f092228 2026-03-31T22:17:28+08:00
  feat: 添加获取 Warfarin 分发和获取方式标签的功能
- d1d5ad7 2026-03-31T22:01:21+08:00
  feat: localize mission and operator voices components
  
  - Updated WMissionRenderer.vue to use localization for mission titles, descriptions, quests, dialogs, and radio messages.
  - Enhanced WOperatorVoices.vue to utilize localized labels for unlock types.
  - Introduced displayLabels.ts for centralized localization functions and mappings.
  - Improved text rendering in WarfarinEndpointRenderer.vue to support localization.
  - Added support for basic HTML tag preservation in text rendering.
  - Enhanced utility functions for localized scalar formatting.
  - Updated i18n files for English, Japanese, and Chinese to include new localization keys.
  - Modified RecipeContentView.vue to display localized legacy descriptions and wiki debug information.
- 9548bea 2026-03-31T20:14:00+08:00
  feat: enhance warfarin utilities and localization
  
  - Added new MaterialCostEntry interface and functions for resolving item definitions and pack item IDs in warfarin utilities.
  - Refactored existing functions for better clarity and performance.
  - Introduced new methods for normalizing material costs and bundles.
  - Updated localization files for English, Japanese, and Chinese to include new warfarin-related terms and phrases.
  - Enhanced tutorial manager with additional interaction types and validation options.
  - Improved RecipeContentView component to support new renderer features and source pack IDs.
- 4948f4b 2026-03-30T21:38:51+08:00
  feat: 添加外观设置，支持主题模式和图标显示模式的选择
- e641242 2026-03-30T21:05:57+08:00
  feat: add favorites page size settings and localization
  
  - Introduced new settings for minimum and maximum items per page for favorites.
  - Added reset defaults option for favorites page size settings.
  - Updated English, Japanese, and Chinese localization files to include new strings.
  - Enhanced FavoritesPanel component to display total items and items per page.
  - Implemented pagination for favorite items in FavoritesPanel.
  - Updated SettingsDialog to allow users to adjust favorites page size settings.
  - Added corresponding methods in settings store to manage favorites page size.
- 17e3816 2026-03-30T06:51:32+08:00
  feat: 添加 Warfarin wiki 渲染器系统，新增 commonmark 和 warfarin-raw-operator 两种 wiki 格式支持
  - 添加完整的 Warfarin wiki 渲染器系统，包括操作员、敌人、设施、装备等多种内容类型的渲染组件
  - 新增 commonmark wiki 格式支持，基于 CommonMark 标准的 Markdown 渲染
  - 新增 warfarin-raw-operator wiki 格式支持，用于渲染 Warfarin 原始操作员数据
  - 添加从 C# 枚举文件自动生成 TypeScript 枚举的脚本 (generate-genums.mjs)
  - 扩展 i18n 系统，新增 localeData 数据结构支持本地化 wiki 内容
  - 增强 pack 加载器，支持获取共享 JSON 数据和处理本地化数据
  - 扩展类型系统，添加 JeiWebLocaleDataEntry 接口和 category 字段支持
  - 更新验证逻辑以支持新的 category 字段
  - 更新 RecipeContentView 以集成新的 wiki 渲染器
- 080e46e 2026-03-25T21:15:18+08:00
  feat: 添加持久化历史记录功能，允许用户保存历史记录设置
- 5d0802a 2026-03-24T06:54:45+08:00
  feat: 添加搜索功能的工作线程支持，优化搜索性能和响应速度
- cd5eb06 2026-03-24T06:54:32+08:00
  feat: enhance pack mirror handling and add wiki debug information
- cf6975a 2026-03-24T05:13:34+08:00
  feat: add I18nSettingsPanel for language settings and i18n coverage statistics
  
  - Introduced I18nSettingsPanel.vue to manage language settings and display i18n coverage.
  - Updated BottomBar.vue to utilize getTagDisplayName for tag display.
  - Refactored CenterPanel.vue to use translation for titles.
  - Enhanced RecipeContentView.vue with structured wiki renderer headers and improved tag display.
  - Updated SettingsDialog.vue to include I18nSettingsPanel and manage language updates.
- 268f948 2026-03-23T00:58:57+08:00
  feat: enhance search functionality with advanced filtering options
  
  - Updated Japanese and Chinese translations for filter placeholders and help texts.
  - Refactored search parsing logic to support complex expressions using a new search expression parser.
  - Introduced a new filter mode toggle (builder and expression) in the BottomBar and ItemEditorPage components.
  - Added UI elements for quick tag filtering and expression token insertion.
  - Improved search matching logic to accommodate new expression syntax.
  - Enhanced filter form to handle negation and tag join modes.
- 82ea775 2026-03-22T06:09:54+08:00
  feat: add SimpleWikiRenderer component for rendering various wiki content types
  
  - Introduced SimpleWikiRenderer.vue to handle markdown, quotes, tables, lists, and dividers.
  - Implemented normalization functions for input blocks and wiki content.
  - Enhanced i18n support by adding new translations for dev mirrors in English, Japanese, and Chinese.
  - Updated PackSource interface to include optional devMirrors.
  - Added functionality to enable and manage dev mirrors in the settings and pack routing.
  - Enhanced RecipeContentView to support new wiki renderers and improved rendering logic.
  - Updated settings dialog to include a toggle for enabling dev mirrors.
  - Refactored pack routing runtime store to handle dev mirrors in mirror URL retrieval.
- 39325f9 2026-03-18T03:27:45+08:00
  feat: 添加FreskyZ-flow-vue子模块同步脚本
- a369ddd 2026-03-18T03:18:42+08:00
  feat: add sharing functionality to Advanced Planner
  
  - Introduced a dropdown button for sharing options in AdvancedPlanner.vue, allowing users to share plans via URL, JSON, or import JSON.
  - Implemented methods for sharing as URL, copying JSON, and importing JSON.
  - Enhanced the payload structure for sharing plans, including view state and forced raw item key hashes.
  - Updated related components (CenterPanel.vue, ItemDialog.vue, RecipeContentView.vue) to emit share events.
  - Added validation for sharing and importing JSON data.
  - Created utility functions for handling node positions and validating planner units.
- f03863e 2026-03-17T21:24:35+08:00
  feat: 添加FreskyZ-flow-vue子模块，更新关于文档和tsconfig配置
- 36b8663 2026-03-17T18:36:15+08:00
  fix: 修复了多产物合成的正确表达和计算 但是lp模式仍存在部分问题 需要修复（lp的某些循环计算可能有bug 需要谨慎对待）
- 57cb40d 2026-03-14T04:18:50+08:00
  feat(planner): implement advanced objective entries and recipe normalization
  
  - Introduced AdvancedObjectiveEntry type for multi-objective planning.
  - Updated PlannerSavePayload to support advanced targets.
  - Added recipeAdapter.ts to normalize recipes into a flat structure for linear programming.
  - Enhanced IndexPage.vue to handle advanced objectives and their types.
  - Modified AdvancedPlanner.vue to support LP optimization mode and display LP raw data.
  - Updated settings store to include line width configuration and related methods.
- f24abf0 2026-03-13T07:19:21+08:00
  feat(sankey-lib): implement Sankey diagram functionality and quant flow renderer settings
  
  - Added core functionalities for Sankey diagrams including node and link models, layout calculations, and rendering utilities.
  - Introduced `constant` function for consistent value retrieval.
  - Implemented `minFAS` for determining link directions to maintain acyclic graphs.
  - Created `sankey` function to generate Sankey layouts with customizable node and link properties.
  - Added `sankeyLinkHorizontal` and `BumpSankeyLoop` for horizontal link rendering.
  - Enhanced settings management to include quant flow renderer options (nodes and sankey) in the application.
  - Updated UI components to support new quant flow renderer settings and integrated them into the settings dialog.
- fac9f72 2026-03-13T05:42:26+08:00
  feat: 添加生产线G6缩放因子和机器数量小数位设置，优化相关组件
- 0838101 2026-03-13T05:21:16+08:00
  feat: add LineFlowView component with VueFlow and G6 rendering options
  
  - Introduced LineFlowView.vue to handle rendering of flow views using either VueFlow or G6.
  - Created LineFlowVueFlowView.vue for VueFlow specific rendering logic.
  - Updated IndexPage.vue to include new line intermediate coloring feature.
  - Enhanced AdvancedPlanner.vue with options for line intermediate coloring and renderer selection.
  - Refactored settings management in SettingsDialog.vue and settings store to accommodate new features.
  - Added support for line intermediate coloring in the production line visualization.
- 7615769 2026-03-13T04:24:59+08:00
  feat: add quantification view and related functionality
  
  - Introduced a new quantification view in the planner with a dedicated tab.
  - Implemented the quantification model in `quantFlow.ts` to handle item and fluid nodes and edges.
  - Enhanced the `IndexPage.vue` to support quantification settings and key bindings.
  - Updated `AdvancedPlanner.vue` to include UI components for the quantification view.
  - Added settings for quantification line width scaling in `SettingsDialog.vue`.
  - Modified key bindings to include shortcuts for the quantification view.
  - Updated relevant components to accommodate the new quantification features and ensure proper data flow.
- abd98d6 2026-03-13T02:26:07+08:00
  feat(planner): add product recovery feature to planner state and UI
  
  - Updated PlannerSavePayload, PlannerInitialState, and PlannerLiveState types to include useProductRecovery.
  - Enhanced ProductionLineNode and ProductionLineEdge types to support recovery metadata.
  - Modified buildProductionLineModel function to handle recovery logic and item nodes.
  - Implemented recovery source handling in the AdvancedPlanner component, including UI updates for displaying recovery information.
  - Added functionality to save and load planner live state with recovery settings.
  - Updated IndexPage and related components to manage and reflect product recovery state.
  - Introduced new computed properties and methods for managing recovery data in the planner.
  - Enhanced visual representation of recovery in the planner UI with badges and tooltips.
  - Added tests for new recovery features and ensured compatibility with existing planner functionality.
- 5fc6cd7 2026-03-12T22:18:36+08:00
  feat: 添加虚拟聚合源支持，优化镜像路由和延迟显示
- 5c53f57 2026-03-12T21:28:27+08:00
  feat: 增强决策收集与状态重计算，优化配方选项展示
- 9fa5225 2026-03-12T20:25:25+08:00
  feat: 添加资源URL解析功能以支持包资产的正确加载
- 52e350f 2026-03-12T01:59:36+08:00
  feat: enhance pack mirror management and latency tracking
  
  - Added mirror latency caching and warmup functionality to improve pack loading performance.
  - Implemented automatic ranking of pack mirrors based on latency for better user experience.
  - Introduced new UI elements to display current active pack mirror and latency information.
  - Updated localization files to include new strings related to mirror management.
  - Refactored settings and pack routing stores to support new mirror handling logic.
  - Improved the overall structure and readability of the codebase related to pack sources and mirrors.
- 10ddeb9 2026-03-11T07:55:09+08:00
  perf(wiki): 图片懒加载以减少初始页面加载开销
  
  通过引入 Intersection Observer API 实现图片懒加载，仅在元素进入视口时开始加载图片资源，从而减少初始页面加载时的网络请求和渲染开销。
- 65d6ae7 2026-03-11T07:35:51+08:00
  feat: 添加加载进度遮罩和远程包缓存功能
  
  - 新增 JeiLoading 组件，支持全屏遮罩和进度条显示
  - 在设置中添加“显示加载遮罩动画”开关，允许用户控制加载动画显示
  - 扩展 IndexedDB 版本至 3，新增远程包缓存存储空间
  - 实现远程数据缓存机制，支持 items、tags、recipeTypes、recipes 等类型缓存
  - 在加载过程中显示进度信息，包括当前加载阶段和百分比
  - 优化包加载流程，支持从缓存读取数据以减少网络请求
- a460abd 2026-03-11T06:43:41+08:00
  feat(plugin): 新增插件系统并重构内置插件模块
  
  - 新增 keepAlive 选项支持 iframe 标签页保持挂载状态
  - 新增多个内置插件：协议终端、BilibiliWiki、Iframe 服务示例、外部检索、目录查询、基质规划器
  - 重构内置插件模块，将插件定义拆分到独立文件
  - 为 iframe 标签页添加加载状态指示器
  - 更新插件 API 文档，补充多标签页配置示例
- fe3d2d7 2026-03-11T05:36:14+08:00
  feat(plugins): 扩展插件宿主API并添加文档
  
  - 新增 HostApiHandler 类型定义，支持插件调用宿主功能
  - 实现 navigateToItem、toggleBookmark、getItemImage 等宿主API
  - 在 PluginIframeTab 中注入宿主API处理器并完善错误处理
  - 添加完整的插件API文档，详细说明通信协议和可用接口
- ab48006 2026-03-11T05:05:33+08:00
  feat(plugin): 新增插件系统以支持自定义标签页和外部服务集成
  
  - 引入插件管理器 (PluginManager) 和类型定义，支持注册、启用/禁用插件
  - 为 ItemDialog、CenterPanel 和 RecipeContentView 组件添加对插件标签页的支持
  - 新增内置插件示例，包括外部搜索、目录 API、iframe 服务和 BilibiliWiki 集成
  - 扩展设置存储以管理插件启用状态和配置
  - 添加 PluginIframeTab 组件以安全加载和与插件 iframe 通信
  - 在设置对话框中集成插件管理和快捷键配置，移除单独的快捷键对话框
- 653ec90 2026-03-11T02:06:04+08:00
  feat(pack): 添加资源包镜像路由支持及配方懒加载
  
  - 在资源包配置中支持镜像地址列表，提供自动/手动选择模式
  - 为配方添加 detailPath 和 detailLoaded 字段实现懒加载
  - 在设置面板中添加镜像路由配置界面，支持延迟测试
  - 优化 Skland 资源包构建脚本，拆分大配方为轻量版和详情文件
  - 更新多语言资源文件，添加镜像相关文本
- 90342b1 2026-03-10T23:55:16+08:00
  feat: add manual pack cache refresh and force reload support
- d53e9ab 2026-02-25T04:27:46+08:00
  feat: 添加图标标签页及相关功能，优化上下文菜单和键绑定
- 9083827 2026-02-25T03:54:42+08:00
  feat: 添加单关模式下的分享编码逻辑，优化分享链接生成
- dd90b31 2026-02-25T03:52:27+08:00
  feat: 添加单关题组的高级共享选项，优化分享链接生成逻辑
- f09e62a 2026-02-25T03:43:20+08:00
  feat: 添加旋转功能到type2拼图块，优化解析逻辑
- 3c4bd14 2026-02-25T02:39:30+08:00
  feat: 修复type2数据的y坐标反转问题
- cae715e 2026-02-25T01:38:01+08:00
  refactor: 优化 CircuitPuzzleBoard 组件的代码格式和可读性
- 9332112 2026-02-25T01:30:12+08:00
  feat: 添加自动解密功能到PlayUI，优化重置逻辑和状态管理
- 3b53792 2026-02-25T01:20:23+08:00
  refactor: 精简 type2 格式解析逻辑，移除不必要的颜色权重处理
- 95f625e 2026-02-25T01:11:02+08:00
  Merge branch 'master' of https://github.com/AndreaFrederica/jei-web
- 1158df7 2026-02-25T01:10:57+08:00
  feat: add Type2 puzzle format support and enhance CircuitPuzzleCollectionPage with search functionality
  
  - Implemented Type2 puzzle format parsing and validation in `type2-format.ts`.
  - Added search functionality in `CircuitPuzzleCollectionPage.vue` to filter levels by title, ID, tags, author, and difficulty.
  - Enhanced entry handling to support Type2 puzzles, including block library loading and error handling.
  - Updated UI to display messages for no matching levels and improved navigation for multi-stage puzzles.
  - Introduced syncing functionality from play mode to editor mode in `CircuitPuzzlePage.vue`.
- 0f99a5d 2026-02-19T05:00:17+08:00
  Revise README for Arknights:Endfield data details
  
  Updated the README to reflect changes in data package location and description for Arknights:Endfield.
- 83607ea 2026-02-18T06:26:40+08:00
  feat(planner): 添加目标速率预设和启动对话框说明
- 5aab038 2026-02-18T06:12:41+08:00
  fix: 修复全屏模式下 q-select 下拉菜单的 z-index 问题
- b4c01de 2026-02-18T05:54:48+08:00
  feat(storage): 支持JEIStorage的异步存储操作和初始化
- be052c2 2026-02-18T05:32:43+08:00
  feat(settings): 添加存储初始化日志以便调试
- 969a3df 2026-02-18T05:24:18+08:00
  feat: add keybindings management and settings storage
  
  - Implemented a new KeyBindingsDialog component for managing keybindings.
  - Added keybindings store to handle keybinding configurations and persistence.
  - Updated ItemDialog to display dynamic key hints based on user-defined keybindings.
  - Enhanced SettingsDialog to include a button for opening the keybindings dialog.
  - Refactored storage utilities to support both localStorage and JEIStorage for settings and keybindings.
  - Introduced a storage helper for synchronous access to settings, improving initialization flow.
- 636158a 2026-02-18T03:58:03+08:00
  feat(settings): 添加检测PC端并禁用移动端界面功能
  fix(licenses): 更新数据来源说明以明确数据来源
  fix(about): 更新版本信息和提交历史
- acc9ab7 2026-02-17T20:28:10+08:00
  fix: 修正数据包列表顺序并更新许可证说明
  
  - 调整 public/packs/index.json 中数据包顺序，将 "Arknights:Endfield Skland Wiki" 移至正确位置
  - 更新 THIRD-PARTY_LICENSES.md 中 aef 数据包的来源说明，明确数据来自 factoriolab-zmd 项目的手动整理
  - 自动生成 about.generated.md 文件，更新版本信息和提交历史
- 36337dd 2026-02-17T06:17:58+08:00
  feat(wiki): 为液体容器生成派生物品并优化表格解析
  
  - 新增派生物品生成机制，自动为“已盛装”等关键词的液体容器创建组合物品
  - 扩展转换器上下文，支持物品图标和标签的缓存与传递
  - 改进表格解析逻辑，自动检测表头行并优化行列顺序
  - 调整部分设备配方的规划器优先级，使反应池等关键设备排序更合理
  - 更新物品索引和轻量清单，包含新生成的派生物品条目
- d070126 2026-02-17T04:36:21+08:00
  feat(ui): 添加物品图标缓存及存储管理界面
  
  - 新增 `useCachedImageUrl` 组合函数，通过 IndexedDB 缓存远程图标并生成 Blob URL
  - 扩展 IndexedDB 工具函数，支持图标缓存的增删改查及存储空间管理
  - 在存储编辑器页面新增“物品图标缓存”和“IndexedDB”标签页
    - 图标缓存页支持预览、搜索、清理及单个删除
    - IndexedDB 页以树形结构展示所有存储空间及条目，支持按键名搜索和清理操作
  - 优化 StackView 组件，对图标 URL 应用缓存机制以提升加载性能并减少网络请求
- 3c6276c 2026-02-17T03:44:03+08:00
  feat(wiki): 为图片添加点击查看功能并更新界面文本
  
  - 在资料查看器中支持点击图片打开全屏查看器
  - 将"合成查看器"重命名为"资料查看器"以更准确反映功能
  - 更新相关界面文本和注释，保持中英文一致性
  - 图片查看功能覆盖wiki组件中的图片、图标和描述中的图片
- 0f4e6e4 2026-02-17T01:34:27+08:00
  fix(circuit-puzzle): 修复页面高度和滚动区域布局问题
  
  - 动态计算页面可用高度，减去顶部导航栏高度
  - 为列表和详情区域添加独立的滚动容器，避免整体页面滚动
  - 优化CSS布局，使用flex布局确保内容区域正确伸缩
- 8de1157 2026-02-17T01:01:36+08:00
  Merge branch 'master' of https://github.com/AndreaFrederica/jei-web
- f383104 2026-02-17T01:01:30+08:00
  chore: 更新图标文件 icon.af
- c9ca316 2026-02-17T01:00:47+08:00
  feat(circuit-puzzle): 重构方块面板并添加收藏功能
  
  - 将方块面板 UI 逻辑提取为独立组件 CircuitPuzzlePiecePanel
  - 新增收藏功能，支持保存、导入和移除常用方块
  - 添加面板垂直分栏布局，支持拖拽调整比例
  - 提取编辑器工具函数至独立模块 editor-utils
  - 在设置存储中增加面板分栏比例持久化支持
- fbbb3ee 2026-02-17T00:56:37+08:00
  Merge pull request #3 from figreojgihgj/master
  
  添加镜像
- 626040c 2026-02-16T23:40:06+08:00
  Delete .github directory
- ac8f513 2026-02-16T23:39:56+08:00
  Delete sync-fork.yml
- 3cd04c6 2026-02-16T22:54:32+08:00
  fix: 移除predev脚本中的sync:temp命令以简化开发流程
- fc721c5 2026-02-16T15:34:17+08:00
  修改镜像信息
- d855121 2026-02-16T23:26:49+08:00
  Update main.yml
- f17738a 2026-02-16T23:25:50+08:00
  Delete .github/workflows/sync.yml
- d4f3cab 2026-02-16T23:23:35+08:00
  Create sync.yml
- e65178b 2026-02-16T23:20:30+08:00
  Create main.yml
- 57e43bb 2026-02-16T15:19:20+08:00
  action
- 106d8e8 2026-02-16T23:13:02+08:00
  Merge branch 'AndreaFrederica:master' into master
- f3187ed 2026-02-16T12:02:40+08:00
  添加镜像
- 883e47c 2026-02-15T22:13:58+08:00
  feat: 添加视为原料功能，增强物品管理和生产计数显示
  fix: 修复打开了任意物品后不能切换数据包的bug
- dac9769 2026-02-15T20:55:24+08:00
  feat: 添加aef-skland数据包构建说明文档，更新关于文件以反映最新版本和提交信息，增强wiki条目导航功能
- b422a48 2026-02-15T08:25:54+08:00
  feat: 添加终末地-协议终端链接到主布局和编辑布局
  docs: 更新关于文件以反映最新版本和提交信息
  docs: 添加aef-skland数据源信息到第三方许可证文件
- 49c4900 2026-02-15T07:57:06+08:00
  支持了aef skland wiki 数据包
- 6069f98 2026-02-15T07:50:33+08:00
  feat: implement image proxy support for packs and items
  
  - Added image proxy configuration to PackManifest and ItemDef.
  - Implemented functions to apply image proxy tokens and normalize URLs.
  - Enhanced the loader to cache and manage pack manifests with image proxy support.
  - Introduced new settings in the UI for managing image proxy configurations.
  - Updated validation to include image proxy fields.
  - Refactored planner logic to consider recipe type priorities.
  - Added new utility functions for handling image URLs in runtime.
  - Updated settings store to persist image proxy tokens and configurations.
  - Improved item and recipe sorting based on planner priorities.
- 1894c41 2026-02-14T00:19:25+08:00
  Merge branch 'master' of https://github.com/AndreaFrederica/jei-web
- 1349927 2026-02-14T00:18:50+08:00
  feat: add line width customization based on rate with curve editor
  
  - Introduced a toggle to enable line width adjustment based on production rate.
  - Added a button to open a dialog for editing the line width curve.
  - Implemented a new component for the line width curve editor with controls for unit selection, axis scaling, and point manipulation.
  - Created utility functions for evaluating line width based on production rates and curve configurations.
  - Updated the rendering logic to apply dynamic stroke widths to edges based on the configured curve.
- 7870c88 2026-02-13T06:17:31+08:00
  Fix line breaks in QQGroupDialog.vue
- 6324f1b 2026-02-13T06:13:56+08:00
  Merge pull request #1 from MicIsHere/master
  
  添加镜像信息
- 9d6bd31 2026-02-13T06:08:38+08:00
  Update QQGroupDialog.vue
- b7bff46 2026-02-13T06:08:16+08:00
  Revise QQGroupDialog content for clarity and links
  
  Updated the text for the domestic access mirror and added additional links.
- 3858d39 2026-02-13T00:25:54+08:00
  update: some text.
- a8c5884 2026-02-13T00:24:25+08:00
  update: some text.
- 8f93cc8 2026-02-12T08:19:51+08:00
  feat: implement v3 URL format for multi-level puzzles
  
  - Add encoding and decoding functions for multi-level puzzles in v3 format.
  - Create tests for the new URL format functions to ensure correct encoding/decoding.
  - Update existing URL format functions to support fixed placements in levels.
  - Enhance CircuitPuzzleCollectionPage and CircuitPuzzlePage to handle multi-level puzzles.
  - Introduce UI elements for managing multi-level stages in the editor.
  - Ensure compatibility with previous URL formats while transitioning to v3.
- d9fd7ce 2026-02-12T05:28:56+08:00
  feat: add CircuitPuzzleShapeCanvas component and enhance settings store for circuit editor panel state
  
  - Introduced CircuitPuzzleShapeCanvas.vue for rendering a grid-based puzzle interface with hover and click interactions.
  - Updated settings store to include state management for the circuit editor piece panel, allowing for position, size, and minimized/docked states.
- afb0a92 2026-02-12T01:09:05+08:00
  feat: integrate itemsLite index and lazy loading
  
  - Add `gen:items-lite` script and execute it during `predev` and `prebuild` to generate reduced item indexes.
  - Include `itemsLite.json` for the aef pack containing essential item data.
  - Update `pack/loader.ts` to support loading `itemsLite` from the manifest, marking items as not fully loaded initially.
  - Add `lazyVisual` prop to `RecipeCard` and `ItemSlot` components to support deferred visual rendering.
  - This change improves initial load performance by minimizing the data processed on startup.
- 2d6492c 2026-02-11T23:36:32+08:00
  feat: adjust layout scroll behavior
  
  Introduce `no-scroll` and `debug-scroll` classes to manage viewport overflow and scrolling behavior dynamically. Update MainLayout to enforce full-height flex layout on home/item routes.
  
  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
- 3b09d7f 2026-02-11T23:17:29+08:00
  feat: add Vitest testing and CircuitPage component
  
  - Configure Vitest, jsdom, and @vitest/ui for unit testing.
  - Add test scripts (test, test:run, test:ui, test:coverage) to package.json.
  - Implement CircuitPage.vue with play and editor modes, including features for URL sharing and level management.
  - Update .gitignore to exclude public/packs/aef-skland.
- b2fe075 2026-02-11T14:25:12+08:00
  feat: 添加 WikiDocRecipeView 组件以支持文档视图，更新 RecipeViewer 以集成新组件
- 3ead8b0 2026-02-10T03:03:49+08:00
  refactor(wiki): update EntryInline rendering to StackView
  
  Replaces the previous `ImageLoader` and manual DOM structure with the
  shared `StackView` component to standardize how wiki entries are
  displayed.
  
  - Integrates `StackView` for both inline and card display modes.
  - Adapts entry data into `SlotContent` and `ItemDef` formats required by
    `StackView`.
  - Removes anchor tag wrapper from inline view, handling navigation via
    click event.
  - Adds `resolveIconUrl` helper to maintain image proxy configuration.
- 5e3a970 2026-02-10T00:36:13+08:00
  feat: enhance wiki component with structured documentation support and color contrast improvements
  
  - Updated `TextInline.vue` to include dynamic color resolution based on theme and ensure readability against backgrounds.
  - Enhanced `RecipeContentView.vue` to support structured wiki documents, allowing for better organization and display of content.
  - Added new `DARK_COLOR_MAP` to `wiki.ts` for improved color management in dark mode.
  - Modified `validate.ts` to include wiki and recipes fields in item definitions.
  - Updated generated documentation to reflect the latest changes and commit history.
- 8dac017 2026-02-07T10:10:59+08:00
  fix: 修正 README 中图标路径并更新生成的文档
- 5506c06 2026-02-07T10:04:45+08:00
  fix: 修正 README 中图标路径
- 8251d10 2026-02-07T09:58:53+08:00
  feat: 更新 README 和生成的文档，调整样式以改善显示效果
- c2956e6 2026-02-07T09:49:54+08:00
  feat: 添加存储编辑器页面及相关路由
- aa6d8c0 2026-02-07T09:36:44+08:00
  feat: add tutorial manager and integrate with dialog system
  
  - Implemented a new tutorial manager to guide users through the application.
  - Added tutorial steps for various stages including welcome, sidebar, item list, recipe viewer, planner, and advanced planner.
  - Integrated tutorial manager with the dialog manager to handle showing and completing tutorials.
  - Updated QQGroupDialog to manage visibility based on whether it is user-managed or not.
  - Enhanced MainLayout to include a sidebar item for accessing the tutorial.
  - Registered dialogs for both the QQ group and tutorial in the dialog manager, allowing for controlled display based on user interactions and settings.
  - Added functionality to track tutorial completion status in settings store.
- 68be2d3 2026-02-07T07:29:08+08:00
  feat: add QQ Group dialog and enhance item handling
  
  - Introduced QQGroupDialog component for displaying the official QQ group information.
  - Updated EditorLayout and MainLayout to include buttons for showing the QQ group dialog.
  - Enhanced item loading to support both directory and array modes, including the creation of an itemsIndex for directory mode.
  - Extracted inline recipes and wiki data from item definitions for better organization.
  - Updated pack validation to include itemsIndex in the manifest.
  - Improved item merging logic to handle inline recipes and ensure unique items.
  - Added functionality to export items in both directory and array formats.
- 515b8c6 2026-02-04T05:40:10+08:00
  feat: add Wiki Renderer page and related functionality
  
  - Implemented WikiRendererPage.vue for rendering wiki documents with file upload support.
  - Added functionality to load wiki files and catalog files from specified directories.
  - Integrated settings for image proxy usage and catalog file name persistence in settings store.
  - Updated routes to include the new Wiki Renderer page.
  - Enhanced existing pages (AboutPage, LicensePage, ReadmePage, ThirdPartyLicensesPage) to support dark mode styling.
  - Introduced new types for wiki data structures in types/wiki.ts.
- 14a59b7 2026-02-03T12:04:31+08:00
  feat: 添加带速带的物品定义，更新相关组件以支持新功能
- 43ee6da 2026-02-03T11:22:28+08:00
  fix: 格式化启动对话框选项类型定义以提高可读性
- 1558538 2026-02-03T11:22:12+08:00
  feat: 添加收藏夹导航栈选项，更新相关组件以支持新功能
- 7925b25 2026-02-03T10:55:15+08:00
  feat: 添加启动对话框支持，更新设置以管理已接受的对话框
- 3fa836e 2026-02-03T10:22:19+08:00
  fix: 更新过滤器占位符文本以支持正确的格式化
- fc02bef 2026-02-03T10:17:15+08:00
  fix: 修复 BottomBar 组件中的 placeholder 绑定方式
- 13d61ef 2026-02-03T10:11:30+08:00
  feat: 更新 CenterPanel 组件中的标签文本以提高可读性
- fcf2bf7 2026-02-03T10:07:21+08:00
  feat: 添加 Cloudflare 构建脚本以支持更好的构建管理
- d59133f 2026-02-03T09:56:51+08:00
  feat: 更新构建信息，添加原生暗色模式支持，优化页面结构和元数据
- 255f0a3 2026-02-03T09:04:37+08:00
  feat: 添加原生暗色模式支持，优化页面结构和元数据，避免vue启动前的闪烁
- d258798 2026-02-03T09:02:06+08:00
  feat: 优化国际化文件，调整文本格式以提高可读性
- 3c7547a 2026-02-03T09:01:54+08:00
  feat: add language selection and localization support
  
  - Implemented a language selection button in MainLayout.vue with options for Chinese, English, and Japanese.
  - Integrated vue-i18n for localization across various components, including IndexPage.vue, AdvancedPlanner.vue, BottomBar.vue, and others.
  - Updated UI elements to use localized strings for labels, placeholders, and tooltips.
  - Enhanced settings store to detect browser language and allow language preference saving.
  - Refactored components to utilize the new localization setup, ensuring a consistent user experience across different languages.
- a2ec007 2026-02-03T07:53:10+08:00
  feat: 更新文档和界面，增强 CenterPanel 组件，添加保存/加载规划方案功能
- c573aa3 2026-02-03T07:42:03+08:00
  feat: enhance CenterPanel with save-plan event and loadAdvancedPlan method
  
  - Added an event emission for 'save-plan' from the AdvancedPlanner component.
  - Introduced a new method `loadAdvancedPlan` to load saved plans into the advanced planner.
  - Updated CSS styles for better layout management, changing overflow properties for improved usability.
- 16160f7 2026-02-03T04:08:21+08:00
  feat: 增强 AdvancedPlanner 组件，添加节点图视图和计算器视图功能
- 6ccaacd 2026-02-03T03:44:56+08:00
  style: 优化 CenterPanel 组件中的 q-tab-panels 代码格式
- 56733bb 2026-02-03T03:43:10+08:00
  feat: enhance CenterPanel with advanced planner and update context menu
  
  - Added a new tab for the advanced planner in CenterPanel.vue.
  - Refactored the tab structure to include recipe and advanced planner views.
  - Implemented a computed property to dynamically set the title based on the active tab.
  - Integrated the advanced planner component with props for pack and item definitions.
  - Updated ItemContextMenu.vue to include an option for adding items to the advanced planner.
  - Modified event emissions to support the new advanced planner functionality.
- decd3e9 2026-02-03T02:45:07+08:00
  style: 优化流程图中输入输出端口样式的代码格式
- 5e01581 2026-02-03T02:40:50+08:00
  fix: 修复流程图中输入输出端口样式计算逻辑
- ebe859d 2026-02-03T02:36:33+08:00
  feat: add ItemContextMenu, ItemDialog, ItemListPanel, RecipeContentView, and SettingsDialog components
  
  - Implemented ItemContextMenu.vue for context menu actions related to items.
  - Created ItemDialog.vue to display detailed information about selected items with tabs for recipes, uses, wiki, and planner.
  - Developed ItemListPanel.vue to show a list of items with pagination and history tracking.
  - Added RecipeContentView.vue to handle the display of recipes and crafting planner functionalities.
  - Introduced SettingsDialog.vue for user settings, including history limit and debug options.
  - Updated settings store to manage new settings related to recipe view mode and debug panel position.
- 3a3d93e 2026-02-02T07:24:22+08:00
  feat: 添加导航栈调试面板功能
  
  添加可拖动的调试面板，用于实时监控导航栈状态和变化。面板显示当前导航栈长度、对话框状态、栈内项目详情以及导航操作日志。同时改进导航栈逻辑，避免重复重置并支持栈内跳转。
- 561abe5 2026-02-02T05:55:07+08:00
  style: 改进 Vue Flow 控件的深色主题样式
  
  修复 Vue Flow 控件在深色主题下图标不显示的问题。由于控件通过 Portal 渲染到 body 下，原样式选择器无法生效，现添加全局样式选择器并优化按钮图标和 MiniMap 的视觉细节。
- edac3fc 2026-02-02T04:52:16+08:00
  fix(jei): 修复流程图拖拽功能，将pan-on-drag设为true
  
  之前设置为[1, 2]导致在某些情况下无法正常拖拽视图，改为true确保始终启用拖拽平移功能。
- 90c57a7 2026-02-01T03:52:38+08:00
  fix(jei): 修复流程图拖拽和连线层级问题
  
  - 将 pan-on-drag 设置为 [1, 2] 以限制为鼠标中键拖拽，避免与节点交互冲突
  - 为所有 stack-view 添加 nodrag nopan 类，防止在物品图标上误触发拖拽
  - 调整连线 zIndex 为 2000 并改用默认类型，确保连线显示在节点上方
  - 移除冗余的 z-index CSS 规则，统一由 Vue Flow 属性控制层级
  - 增加节点宽度和间距，提升流程图可读性
- 9860f25 2026-02-01T03:22:06+08:00
  fix: 修复上下文菜单关闭后目标未清除的问题
  
  修复在关闭上下文菜单后未清除 contextMenuTarget 导致的下次菜单可能显示异常的问题。通过添加 @hide 事件处理来重置目标变量，确保菜单状态正确。
- 3e7b191 2026-02-01T03:11:51+08:00
  feat(app): 添加收藏夹和面板折叠功能及全屏支持
  
  - 在设置存储中添加收藏夹和面板的折叠状态字段
  - 为主布局添加网页全屏切换按钮，支持顶栏样式适配
  - 为收藏夹和面板区域添加折叠/展开功能，支持鼠标悬停触发按钮
  - 在合成规划器的节点图和生产线视图中添加页面内全屏和元素全屏功能
  - 扩展键盘快捷键，支持使用 T/G/L/C 或 1/2/3/4 快速切换到合成规划器的不同标签页
  - 更新关于页面的构建信息以反映最新提交
- ab432e7 2026-01-31T05:57:22+08:00
  feat(app): 添加文档页面和构建信息生成脚本
  
  - 新增关于、README、许可证和第三方许可证页面，支持内嵌Markdown渲染
  - 添加构建信息生成脚本，自动从Git仓库提取版本历史和提交信息
  - 更新路由配置以支持新的文档页面路径
  - 在主导航和编辑器布局中添加文档页面链接
  - 修改package.json脚本，在开发/构建/安装前自动生成文档文件
  - 将许可证链接从外部GitHub页面改为内部路由
- 05774c1 2026-01-31T05:33:21+08:00
  feat(editor): 添加本地包管理和资源管理器
  
  - 新增本地包管理器，支持保存/加载/删除浏览器中的编辑进度
  - 新增资源管理器页面，支持上传和管理图片资源
  - 为编辑器添加拼音搜索支持，提升中文搜索体验
  - 改进编辑器布局，添加变更对比和批量接受/撤销功能
  - 增强ZIP导出功能，自动包含引用的资源文件
- ba5e316 2026-01-31T02:46:48+08:00
  style: 添加全局滚动条样式以提升视觉一致性
  
  - 为所有元素添加统一的细滚动条，使用半透明灰色
  - 支持 Webkit 浏览器（Chrome、Safari、Edge）的标准样式
  - 添加暗色模式适配，在深色主题下使用浅色滚动条
  - 实现悬停和激活状态的颜色变化增强交互反馈
- 1582627 2026-01-31T02:35:59+08:00
  feat(编辑器): 为配方类型编辑器添加默认值管理功能
  
  - 在编辑界面新增"Defaults"区域，支持添加、编辑和删除默认值
  - 实现默认值键值对的增删改查操作，支持多种数据类型（数字、布尔值、字符串、对象）
  - 添加输入验证和用户提示，防止重复键名
  - 提供JSON解析功能，支持复杂对象的编辑
- 10c9805 2026-01-31T02:27:44+08:00
  feat(editor): 添加 JEI 数据包编辑器
  
  - 新增编辑器布局和页面，支持编辑物品、配方类型、配方和标签
  - 添加 Pinia 存储 (editor.ts) 用于管理编辑状态和持久化
  - 扩展 EssentialLink 组件以支持内部路由
  - 更新配方类型定义，允许 machine 字段为数组
  - 在配方规划器中支持处理机器数组
  - 添加 jszip 依赖用于导出 ZIP 包
  - 在 Quasar 配置中添加 Notify 插件
- 14e836b 2026-01-30T13:36:04+08:00
  feat(ui): 添加移动端适配和上下文菜单支持
  
  - 为移动端添加底部导航栏，支持在收藏、详情和列表间切换
  - 实现右键和长按触发的上下文菜单，提供快速操作选项
  - 优化移动端布局和样式，包括对话框全屏显示和响应式调整
  - 在多个组件中新增 item-context-menu 和 item-touch-hold 事件处理
- 9a4d9dd 2026-01-30T12:10:52+08:00
  feat(router): 为物品页面添加路由支持与URL同步
  
  - 新增路由 `/item/:keyHash/:tab?` 指向 IndexPage，支持通过 URL 直接访问特定物品
  - 在 IndexPage 中集成 vue-router，添加路由状态解析与应用逻辑（applyRouteState）
  - 实现 URL 与页面状态的同步（syncUrl），包括物品、标签和整合包的切换
  - 根据当前物品和整合包动态更新网页标题
  - 调整对话框打开/关闭、导航返回等操作以同步更新 URL
- 1c38217 2026-01-30T11:24:36+08:00
  feat: 添加深色模式支持
  
  - 在设置中新增深色模式选项（自动/亮色/暗色）
  - 在顶部工具栏添加主题切换按钮
  - 为应用全局、历史栏、搜索栏、规划器等组件添加深色样式
  - 根据主题动态调整流程图的背景网格颜色
  - 启用 Quasar 的 Dark 插件以支持主题切换
- 2d09dea 2026-01-30T10:52:22+08:00
  feat(layout): 在主导航中添加博客、Wiki和小说助手链接
  
  添加三个新的导航链接，分别指向博客、Wiki和小说助手子站点，方便用户快速访问相关服务。
- 467be18 2026-01-30T10:40:33+08:00
  docs(layout): 更新主页链接以指向项目相关资源
  
  - 将默认的 Quasar 框架链接替换为项目特定的 GitHub 仓库链接
  - 添加项目许可证 (MPL 2.0) 和第三方许可证的快捷访问链接
  - 移除不再相关的社区和社交媒体链接，使布局更专注于项目自身
- 2f80165 2026-01-30T10:27:24+08:00
  feat(planner): 新增生产线视图并增强循环配方支持
  
  - 添加生产线模型构建器，支持生成机器、物品和流体节点的可视化流程图
  - 在合成规划器中新增“生产线”标签页，展示优化的生产流程布局
  - 增强循环配方支持，添加 cycleKeys、cycleFactor 等字段以精确计算种子需求
  - 添加 wrangler.toml 配置文件，支持 Cloudflare Pages 部署
  - 更新 README 文档，添加项目功能说明、开发指南和第三方许可证信息
  - 添加 MPL-2.0 许可证文件和第三方许可证说明文件
- 0bc2cd0 2026-01-30T09:22:46+08:00
  feat: 添加多包支持并改进配方规划器
  
  - 新增公共包索引文件以支持动态加载多个游戏包
  - 在设置中添加包选择功能并持久化用户偏好
  - 为所有物品视图添加鼠标悬停事件传递
  - 修复配方规划器中非法循环检测逻辑，避免选择导致死循环的配方
  - 添加规划器回归测试确保循环检测正确性
  - 更新应用标题和界面文本
  - 统一Arknight:Endfield的显示名称格式
- d6feded 2026-01-30T08:51:20+08:00
  feat(planner): 新增生产计划器速率计算与机器统计功能
  
  为生产计划器添加完整的速率计算系统，包括：
  - 新增 rational.ts、units.ts、types.ts 实现精确有理数运算和单位转换
  - 扩展生成脚本以包含机器功率、速度等默认属性
  - 增强计划器树状图，显示物品/秒、机器数量、传送带需求和电力消耗
  - 添加表格视图，展示总消耗统计和机器需求汇总
  - 支持按物品、物品/秒、物品/分、物品/时不同单位设定生产目标
- 518cfa1 2026-01-30T06:52:01+08:00
  feat: 添加高级过滤器对话框以支持多条件物品筛选
  
  - 在搜索框旁添加过滤器图标，点击可打开高级过滤器对话框
  - 支持通过物品名称、物品ID、命名空间和标签进行多条件组合筛选
  - 添加动态过滤的选择器，支持输入时实时筛选可用选项
  - 过滤器表单支持清空、取消和应用操作
  - 修改标签匹配逻辑为包含匹配而非完全匹配
  - 移除 normalizeSearchTagId 函数，简化标签搜索逻辑
- 5c4847f 2026-01-30T06:38:23+08:00
  feat: 添加物品维基页面支持Markdown渲染
  
  - 新增“Wiki”标签页，用于显示物品的详细信息
  - 集成markdown-it库解析物品描述为HTML格式
  - 支持快捷键'W'快速打开维基页面
  - 显示物品ID、meta值、描述和标签信息
  - 添加CSS样式确保Markdown内容的美观显示
- 53282b0 2026-01-30T06:24:50+08:00
  feat: 为合成规划器添加自动规划算法和交互式流程图
  
  - 实现 autoPlanSelections 算法，自动选择配方并处理循环依赖
  - 使用 Vue Flow 替换静态 SVG 显示，支持缩放、平移和节点交互
  - 在配方查看器中添加机器图标点击功能，可直接查看机器物品
  - 优化配方分组显示逻辑，在"全部"分组中按类型展示配方
  - 添加 Claude 权限配置和 Vue Flow 类型定义
  - 调整布局样式，移除不必要的滚动限制
- 7803296 2026-01-30T05:33:41+08:00
  feat(planner): 添加配方规划器核心功能与界面
  
  - 新增配方规划器核心逻辑模块 planner.ts，支持构建需求树、检测循环与计算催化剂
  - 新增规划器 UI 类型定义模块 plannerUi.ts，定义状态与保存格式
  - 在物品详情页添加“规划器”标签页，集成 CraftingPlannerView 组件
  - 支持保存/加载规划方案，在侧边栏显示已保存线路列表
  - 更新 AEF 数据生成脚本，将配方分类改为按机器分类，并关联机器物品
  - 更新 ESLint 配置以支持 Vue 单文件组件的 TypeScript 解析
- 5318ed3 2026-01-30T03:59:23+08:00
  feat(ui): 增加配方查看面板模式并优化物品展示
  
  - 在设置中新增配方查看模式（弹窗/面板）和配方槽物品显示名称选项
  - 为 WorldgenRecipeView 和 SlotLayoutRecipeView 组件添加配方槽物品名称显示控制
  - 在 SlotLayoutRecipeView 中添加配方箭头指示器以区分输入输出槽位
  - 扩展 StackView 组件，支持槽位模式布局和详细工具提示信息
  - 修改 IndexPage，支持在面板模式下显示配方查看器，并添加鼠标滚轮翻页功能
  - 更新设置存储结构以持久化新增选项
- 81e7397 2026-01-30T03:40:25+08:00
  feat: 新增 AEF 游戏数据包并优化界面布局
  
  - 新增 Arknights: Endfield (AEF) 游戏数据包，包含完整的物品、配方、标签和图标资源
  - 为 ItemDef 类型添加 iconSprite 字段以支持雪碧图形式的图标显示
  - 在 StackView 组件中实现 iconSprite 的渲染支持
  - 添加设置存储 (settings store) 以管理历史记录限制和调试布局开关
  - 重构主页面布局，实现自适应分页和可调试的滚动区域
  - 优化 SlotLayoutRecipeView 的网格列宽和水平滚动
  - 添加数据包切换、设置对话框和搜索语法支持（@itemid/@gameid/@tag）
  - 新增脚本用于从外部数据源生成 AEF 数据包
- 817b2d6 2026-01-30T01:29:42+08:00
  feat(jei): 实现完整的 JEI 配方查看界面和索引系统
  
  - 添加 JEI 核心类型定义（ItemDef、Recipe、RecipeTypeDef 等）
  - 实现数据包加载器，支持从 JSON 文件加载物品、配方类型和配方
  - 创建索引系统，支持按物品查找生产和消耗配方
  - 添加完整的 Vue 组件：配方查看器、槽位布局视图、世界生成视图、参数视图、物品堆栈视图
  - 实现主页面，包含收藏夹、物品列表、历史记录和配方对话框
  - 添加键盘快捷键支持（A 收藏、R 查看配方、U 查看用途、Esc 关闭、Backspace 返回）
  - 添加演示数据包，包含铁矿石、铁锭、铁镐等示例物品和配方
  - 更新 .gitignore 和 VS Code 设置
- ddc66bd 2026-01-30T00:00:09+08:00
  Initialize the project 🚀
