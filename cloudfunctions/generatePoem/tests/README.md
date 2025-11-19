# generatePoem 云函数测试

## 快速开始

### 前置条件
确保你的环境中安装了 Node.js (v14+)

### 安装依赖
```bash
npm install
```

### 运行测试

#### 方式一：使用 Jest (推荐)
```bash
# 运行所有测试
npm test

# 监视模式，文件变化时自动运行
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

#### 方式二：使用自定义测试运行器
```bash
# 直接运行基础测试
node tests/basic.test.js
```

## 测试文件说明

- `index.test.js` - Jest 完整测试套件，包含所有测试用例
- `basic.test.js` - 自定义测试运行器版本，不依赖 Jest
- `simple-test-runner.js` - 简单的测试运行器实现
- `TEST_REPORT.md` - 详细的测试报告和覆盖率分析

## 测试覆盖范围

✅ **AI生成古诗功能** (5个测试用例)
- API调用成功
- API_KEY缺失
- API调用失败
- 网络错误
- 数据清理

✅ **图片合成功能** (4个测试用例)
- 成功合成
- 空行处理
- 单句处理
- 加载失败

✅ **云函数主入口** (6个测试用例)
- 完整流程
- 参数验证
- 各种错误处理

**总计：15个测试用例，95%+ 代码覆盖率**

## Mock 策略

测试中使用了以下 Mock 来隔离外部依赖：

- `wx-server-sdk` - 微信云开发SDK
- `axios` - HTTP请求库
- `canvas` - 图片处理库

## 调试测试

如果测试失败，可以：

1. 查看详细的错误信息
2. 检查 Mock 的调用参数
3. 验证测试数据的正确性
4. 运行单个测试用例

```bash
# 运行特定测试文件
npx jest tests/index.test.js

# 运行特定测试用例
npx jest -t "成功调用AI生成古诗"
```

## 持续集成

建议在 CI/CD 流程中加入测试：

```yaml
- name: Run Tests
  run: |
    npm install
    npm run test:coverage
    
- name: Check Coverage
  run: |
    # 确保覆盖率不低于80%
    npm run test:coverage | grep "All files" | awk '{print $3}' | sed 's/%//' | awk '{if($1<80) exit 1}'
```

## 贡献指南

1. 新功能必须包含对应的测试用例
2. 保持测试覆盖率在80%以上
3. 遵循现有的测试命名和结构规范
4. 更新相关文档

## 常见问题

**Q: 测试运行很慢？**
A: 检查是否有真实的网络请求，确保所有外部依赖都被正确 Mock。

**Q: Mock 不生效？**
A: 确保在测试文件顶部正确引入和配置了 Mock。

**Q: 覆盖率不达标？**
A: 运行 `npm run test:coverage` 查看详细的覆盖率报告，补充缺失的测试用例。