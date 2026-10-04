# 首版以 CloudBase 云函数实现创作闭环

首版以最低固定成本优先，复用现有 CloudBase 个人版的云函数、文档型数据库和私有存储，不开通云托管、不引入 MySQL、Redis 或 BullMQ。早期规格中建议的 NestJS 与 BullMQ 保留为并发和运营需求增长后的演进路线；当前由「创作中」页直接调用 `runCreation`，并由每分钟定时触发器兜底派发，再配合数据库状态、恢复函数和过期清理完成异步任务。

## Considered Options

- CloudBase 云托管 + NestJS + BullMQ：结构更完整，但需要常驻 Worker 与 Redis，首版固定成本和运维复杂度较高。
- CloudBase 云函数 + 文档数据库：适合当前单用户单任务、模型调用不超过 60 秒的 MVP，并能复用现有环境。

## Consequences

- 所有后台处理必须是无状态、可重复执行的云函数；任务领取与状态更新必须使用事务或条件更新。
- 不可依赖进程内定时器或 fire-and-forget 请求；`runCreation` 由客户端发起并有每分钟定时兜底，定时函数还负责恢复滞留任务和清理资产。
- 当峰值并发、任务积压或函数时限不再满足需求时，迁移到队列 Worker，保留现有任务与资产契约。
