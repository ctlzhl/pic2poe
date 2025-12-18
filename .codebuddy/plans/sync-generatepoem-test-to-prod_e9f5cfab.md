## Product Overview

同步已测试通过的 generatePoem_test 代码到正式函数 generatePoem，并做好部署准备。

## Core Features

- 确认 generatePoem_test 代码基线与依赖
- 覆盖 generatePoem 代码为测试版本内容
- 校验配置、环境变量与依赖一致性
- 进行必要的回归验证与部署前检查
- 生成部署与回滚指引

## 技术方案

- 代码同步：将 generatePoem_test 源文件与依赖覆盖 generatePoem
- 配置校验：比对并同步环境变量、依赖清单与函数配置
- 测试校验：运行核心用例与健康检查确保行为一致
- 部署准备：生成部署步骤与回滚预案，确保可快速恢复

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 全局搜索并定位 generatePoem_test 与 generatePoem 的代码、配置与依赖差异
- Expected outcome: 明确需同步的文件、配置与依赖清单

### Skill

- **skill-creator**
- Purpose: 如需创建/更新同步或部署相关的自动化技能模板
- Expected outcome: 产出可复用的技能描述或模板