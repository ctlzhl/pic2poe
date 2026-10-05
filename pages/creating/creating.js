const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')

const POLL_INTERVAL = 2000
const RUN_TIMEOUT = 65000
const SUCCESS_COUNTDOWN_SECONDS = 3
const TYPE_TITLE = { poem: '五言绝句', review: '图片点评', copy: '配图文案' }
const STATUS_TEXT = {
  queued: '已收到，正在排队创作',
  analyzing: '正在读懂照片里的画面',
  generating: '正在写下这一刻',
  validating: '正在整理最终结果',
  succeeded: '创作完成',
  failed: '这次创作没有完成'
}
const STATUS_PROGRESS = { queued: 12, analyzing: 36, generating: 70, validating: 90, succeeded: 100 }

Page({
  data: {
    taskId: '',
    status: 'queued',
    statusText: STATUS_TEXT.queued,
    attemptNumber: 1,
    workId: '',
    errorMessage: '',
    retrying: false,
    countdown: SUCCESS_COUNTDOWN_SECONDS,
    previewUrl: '',
    typeTitle: '',
    progressPercent: STATUS_PROGRESS.queued,
    showSlowMessage: false
  },

  onLoad(options) {
    const taskId = options.taskId || ''
    if (!taskId) {
      wx.showToast({ title: '创作任务无效', icon: 'none' })
      wx.navigateBack()
      return
    }
    const preview = typeof options.preview === 'string' ? options.preview : ''
    let previewUrl = preview
    if (preview && !/^(?:wxfile:|https?:|\/)/.test(preview)) {
      try { previewUrl = decodeURIComponent(preview) } catch (error) { previewUrl = '' }
    }
    this.setData({ taskId, previewUrl, typeTitle: TYPE_TITLE[options.type] || '' })
    this.startPolling()
    this.requestRun()
  },

  onUnload() {
    this.pageVisible = false
    this.stopPolling()
    this.stopSuccessCountdown()
  },

  onHide() {
    this.pageVisible = false
    this.stopPolling()
    this.stopSuccessCountdown()
  },

  onShow() {
    this.pageVisible = true
    if (this.data.status === 'succeeded') {
      this.startSuccessCountdown()
      return
    }
    if (this.data.taskId && !['failed', 'succeeded'].includes(this.data.status)) {
      this.startPolling()
      this.requestRun()
    }
  },

  stopPolling() {
    this.pollEpoch = (this.pollEpoch || 0) + 1
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.slowTimer) clearTimeout(this.slowTimer)
    this.pollTimer = null
    this.slowTimer = null
  },

  startPolling() {
    this.stopPolling()
    this.pollTask()
    this.pollTimer = setInterval(() => this.pollTask(), POLL_INTERVAL)
    this.slowTimer = setTimeout(() => {
      if (!['failed', 'succeeded'].includes(this.data.status)) {
        this.setData({ showSlowMessage: true })
      }
    }, 10000)
  },

  async pollTask() {
    if (this.pollInFlight || !this.data.taskId) return
    const pollEpoch = this.pollEpoch
    this.pollInFlight = true
    try {
      const response = await callFunctionWithTimeout('getCreation', { taskId: this.data.taskId })
      if (this.pageVisible === false || pollEpoch !== this.pollEpoch) return
      if (!response.result?.ok) throw new Error(response.result?.message || '查询创作进度失败')
      const task = response.result.data
      const status = task.status || 'queued'
      this.setData({
        status,
        statusText: STATUS_TEXT[status] || '正在创作',
        progressPercent: STATUS_PROGRESS[status] || this.data.progressPercent,
        showSlowMessage: ['failed', 'succeeded'].includes(status) ? false : this.data.showSlowMessage,
        attemptNumber: task.attemptNumber || 1,
        workId: task.workId || '',
        errorMessage: task.errorMessage || ''
      }, () => {
        if (status === 'failed' || status === 'succeeded') this.stopPolling()
        if (status === 'failed') this.stopSuccessCountdown()
        if (status === 'succeeded') this.startSuccessCountdown()
      })
    } catch (error) {
      console.error('轮询创作任务失败:', error)
    } finally {
      this.pollInFlight = false
    }
  },

  reconnect() {
    if (['failed', 'succeeded'].includes(this.data.status)) return
    this.setData({ showSlowMessage: false })
    this.startPolling()
    this.requestRun()
  },

  async requestRun() {
    if (this.runInFlight || !this.data.taskId || this.data.status !== 'queued') return
    this.runInFlight = true
    try {
      const response = await callFunctionWithTimeout('runCreation', { taskId: this.data.taskId }, RUN_TIMEOUT)
      if (!response.result?.ok) console.error('runCreation 返回失败:', response.result)
    } catch (error) {
      console.error('派发创作任务失败:', error)
    } finally {
      this.runInFlight = false
    }
  },

  async retry() {
    if (this.data.retrying) return
    this.stopPolling()
    this.setData({ retrying: true })
    try {
      const response = await callFunctionWithTimeout('retryCreation', { taskId: this.data.taskId })
      if (!response.result?.ok) throw new Error(response.result?.message || '重新创作失败')
      this.stopSuccessCountdown()
      this.setData({ status: 'queued', statusText: STATUS_TEXT.queued, progressPercent: STATUS_PROGRESS.queued, showSlowMessage: false, errorMessage: '' })
      this.startPolling()
      this.requestRun()
    } catch (error) {
      console.error('重试创作任务失败:', error)
      showErrorToast(error, '重新创作失败，请稍后再试。')
    } finally {
      this.setData({ retrying: false })
    }
  },

  backToCreate() {
    wx.navigateBack({ delta: 1 })
  },

  stopSuccessCountdown() {
    if (this.successTimer) clearTimeout(this.successTimer)
    this.successTimer = null
    this.successCountdownStarted = false
  },

  startSuccessCountdown() {
    if (this.successCountdownStarted || !this.data.workId) return
    this.successCountdownStarted = true
    this.setData({ countdown: SUCCESS_COUNTDOWN_SECONDS })

    const tick = () => {
      const countdown = this.data.countdown - 1
      if (countdown <= 0) {
        this.successTimer = null
        this.goResult()
        return
      }
      this.setData({ countdown })
      this.successTimer = setTimeout(tick, 1000)
    }

    this.successTimer = setTimeout(tick, 1000)
  },

  goResult() {
    if (!this.data.workId) return
    this.stopSuccessCountdown()
    wx.redirectTo({ url: `/pages/result/result?workId=${this.data.workId}&fresh=1` })
  }
})
