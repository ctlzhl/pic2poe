const ACTIVE_STATUSES = new Set(['queued', 'analyzing', 'generating', 'validating'])

const hasActiveTask = (tasks = []) => tasks.some((task) => ACTIVE_STATUSES.has(task?.status))

module.exports = { hasActiveTask }
