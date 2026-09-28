const { uploadFileWithTimeout, callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')
const { ALLOWED_IMAGE_EXTENSIONS, getImageExtensionFromPath } = require('../../utils/image')
const { requirePrivacyAuthorization } = require('../../utils/privacy')
const { createWorkingImage } = require('../../utils/workingImage')

const MAX_FILE_SIZE = 6 * 1024 * 1024
const PREPARE_TIMEOUT = 30000
const HEIC_EXTENSIONS = new Set(['heic', 'heif'])

const generateTypes = [
  { value: 'poem', title: '五言绝句', description: '把此刻写成一首诗' },
  { value: 'review', title: '图评', description: '读出照片里的故事' },
  { value: 'copy', title: '文案', description: '获得可直接分享的文字' }
]

const moods = [
  { value: 'auto', title: '自动' },
  { value: 'warm', title: '温暖' },
  { value: 'quiet', title: '安静' },
  { value: 'humorous', title: '幽默' },
  { value: 'healing', title: '治愈' }
]

const createIdempotencyKey = () => `create_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const getImageInfo = (src) => new Promise((resolve, reject) => {
  wx.getImageInfo({ src, success: resolve, fail: reject })
})

const getImageExtension = async (tempFilePath) => {
  const extensionFromPath = getImageExtensionFromPath(tempFilePath)
  if (HEIC_EXTENSIONS.has(extensionFromPath)) return extensionFromPath
  if (ALLOWED_IMAGE_EXTENSIONS.includes(extensionFromPath)) return extensionFromPath

  const imageInfo = await getImageInfo(tempFilePath)
  const type = String(imageInfo.type || '').toLowerCase()
  if (HEIC_EXTENSIONS.has(type)) return type
  if (type === 'jpeg') return 'jpg'
  if (ALLOWED_IMAGE_EXTENSIONS.includes(type)) return type
  return ''
}

const getFailureMessage = (result, fallback) => result?.message || fallback

Page({
  data: {
    imageUrl: '',
    showCreationForm: false,
    assetId: '',
    idempotencyKey: '',
    prepareState: 'idle',
    prepareMessage: '',
    preparing: false,
    submitting: false,
    generateTypes,
    moods,
    generateType: 'poem',
    mood: 'auto',
    location: '',
    moment: ''
  },

  onLoad() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  resetDraft() {
    // Tab 页会被缓存；离开后必须清掉本次尚未提交的创作状态。
    this.prepareRunId = (this.prepareRunId || 0) + 1
    this.setData({
      imageUrl: '',
      showCreationForm: false,
      assetId: '',
      idempotencyKey: '',
      prepareState: 'idle',
      prepareMessage: '',
      preparing: false,
      submitting: false,
      generateType: 'poem',
      mood: 'auto',
      location: '',
      moment: ''
    })
  },

  onHide() {
    // 系统相册属于原生全屏页面，也会触发 onHide；此时仍要接收用户刚选中的图片。
    if (this.isChoosingMedia) return
    this.resetDraft()
  },

  async chooseImage() {
    if (this.data.preparing || this.data.submitting) return

    const prepareRunId = (this.prepareRunId || 0) + 1
    this.prepareRunId = prepareRunId
    const isCurrentRun = () => this.prepareRunId === prepareRunId
    const startedAt = Date.now()
    let stageStartedAt = startedAt
    const stagesMs = {}
    const finishStage = (name) => {
      const now = Date.now()
      stagesMs[name] = now - stageStartedAt
      stageStartedAt = now
    }
    let outcome = 'cancelled'
    let inputBytes = 0
    let working = null
    let stagingFileIds = []
    const cleanupStagingFiles = async () => {
      if (!stagingFileIds.length) return
      const fileList = stagingFileIds
      stagingFileIds = []
      try {
        await wx.cloud.deleteFile({ fileList })
      } catch (cleanupError) {
        console.warn('回收暂存图片失败:', cleanupError)
      }
    }
    try {
      await requirePrivacyAuthorization()
      finishStage('privacyMs')
      this.isChoosingMedia = true
      let selection
      try {
        selection = await wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed', 'original']
        })
      } finally {
        this.isChoosingMedia = false
      }
      finishStage('selectionMs')
      const file = selection.tempFiles?.[0]
      const tempFilePath = file?.tempFilePath || ''
      if (!tempFilePath) throw new Error('未获取到图片路径')
      inputBytes = file.size || 0
      if (!isCurrentRun()) { outcome = 'abandoned'; return }
      if (file.size > MAX_FILE_SIZE) throw new Error('图片过大，请选择 6MB 以内的图片。')

      let extension = ''
      try {
        extension = await getImageExtension(tempFilePath)
      } catch (error) {
        console.warn('客户端图片格式识别失败，将由云端继续校验：', error)
      }
      if (HEIC_EXTENSIONS.has(extension)) {
        outcome = 'unsupported'
        wx.showModal({
          title: '暂不支持 HEIC 图片',
          content: '请先将照片导出为 JPG，或在 iPhone「设置－相机－格式」中选择“兼容性最佳”后再拍摄。',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }
      if (!extension) throw new Error('暂不支持这种图片格式，请选择 JPG、PNG 或 WebP。')
      finishStage('formatMs')
      if (!isCurrentRun()) { outcome = 'abandoned'; return }

      this.setData({
        imageUrl: tempFilePath,
        showCreationForm: true,
        assetId: '',
        idempotencyKey: '',
        prepareState: 'pending',
        preparing: true,
        prepareMessage: '正在创建上传任务…'
      })

      const expectedWorkingExtension = extension === 'jpeg' ? 'jpg' : extension
      const ticketStartedAt = Date.now()
      const ticketPromise = callFunctionWithTimeout('createImageUpload', {
        extension,
        workingExtension: expectedWorkingExtension
      })
      const localStartedAt = Date.now()
      const workingPromise = createWorkingImage(tempFilePath, inputBytes)
      const [uploadTicket, preparedWorking] = await Promise.all([
        ticketPromise.then((ticket) => {
          stagesMs.createUploadMs = Date.now() - ticketStartedAt
          return ticket
        }),
        workingPromise.then((image) => {
          stagesMs.localWorkMs = Date.now() - localStartedAt
          return image
        })
      ])
      working = preparedWorking?.extension === expectedWorkingExtension ? preparedWorking : null
      stageStartedAt = Date.now()
      if (!isCurrentRun()) { outcome = 'abandoned'; return }
      if (!uploadTicket.result?.ok) {
        console.error('createImageUpload 返回失败:', uploadTicket.result)
        throw new Error(getFailureMessage(uploadTicket.result, '创建上传任务失败，请稍后重试。'))
      }
      const { assetId, stagingPath, workingStagingPath } = uploadTicket.result.data
      this.setData({ prepareMessage: '正在上传照片…' })
      const uploads = [{ cloudPath: stagingPath, filePath: tempFilePath }]
      if (working && workingStagingPath) uploads.push({ cloudPath: workingStagingPath, filePath: working.path })
      const settled = await Promise.allSettled(uploads.map(({ cloudPath, filePath }) => uploadFileWithTimeout(cloudPath, filePath)))
      stagingFileIds = settled
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value?.fileID)
        .filter(Boolean)
      finishStage('uploadMs')
      const originalUpload = settled[0]
      if (originalUpload.status === 'rejected') throw originalUpload.reason
      if (!originalUpload.value?.fileID) throw new Error('图片上传未完成，请重试。')
      const workingUpload = settled[1]
      if (workingUpload && (workingUpload.status === 'rejected' || !workingUpload.value?.fileID)) {
        console.warn('工作图上传失败，改用原图处理:', workingUpload.reason || '未返回文件 ID')
        working = null
      }
      if (!isCurrentRun()) {
        outcome = 'abandoned'
        await cleanupStagingFiles()
        return
      }
      this.setData({ prepareMessage: '正在优化图片…' })
      const response = await callFunctionWithTimeout('prepareImage', {
        assetId,
        fileID: originalUpload.value.fileID,
        ...(workingUpload?.status === 'fulfilled' && workingUpload.value?.fileID
          ? { workingFileID: workingUpload.value.fileID } : {})
      }, PREPARE_TIMEOUT)
      finishStage('prepareMs')
      if (!response.result?.ok) throw new Error(getFailureMessage(response.result, '图片处理失败，请换一张再试。'))
      stagingFileIds = []
      if (!isCurrentRun()) { outcome = 'abandoned'; return }

      this.setData({
        assetId,
        idempotencyKey: createIdempotencyKey(),
        prepareState: 'ready',
        prepareMessage: '图片已准备好'
      })
      outcome = 'ready'
    } catch (error) {
      if (error?.errMsg?.includes('cancel')) return
      await cleanupStagingFiles()
      if (!isCurrentRun()) { outcome = 'abandoned'; return }
      outcome = 'failed'
      console.error('上传并处理图片失败:', error)
      this.setData({ assetId: '', prepareState: 'error', prepareMessage: '图片准备失败，点按照片重试' })
      showErrorToast(error, '图片处理失败，请换一张再试。')
    } finally {
      console.info('[imageUploadTiming]', { outcome, inputBytes, workingBytes: working?.bytes || 0, ...stagesMs, totalMs: Date.now() - startedAt })
      if (isCurrentRun()) this.setData({ preparing: false })
    }
  },

  selectGenerateType(event) {
    this.setData({ generateType: event.currentTarget.dataset.value })
  },

  selectMood(event) {
    this.setData({ mood: event.currentTarget.dataset.value })
  },

  updateLocation(event) {
    this.setData({ location: event.detail.value })
  },

  updateMoment(event) {
    this.setData({ moment: event.detail.value })
  },

  async startCreation() {
    const { assetId, idempotencyKey, preparing, submitting, generateType, mood, location, moment } = this.data
    if (preparing) return
    if (!assetId) {
      wx.showToast({ title: '请先选择一张可用图片', icon: 'none' })
      return
    }
    if (submitting) return

    this.setData({ submitting: true })
    wx.showLoading({ title: '正在创建任务…', mask: true })
    try {
      const response = await callFunctionWithTimeout('createCreation', {
        imageAssetId: assetId,
        generateType,
        mood,
        location,
        moment,
        idempotencyKey
      })
      if (!response.result?.ok) {
        console.error('createCreation 返回失败:', response.result)
        throw new Error(getFailureMessage(response.result, '创建创作任务失败，请稍后重试。'))
      }

      this.setData({ idempotencyKey: createIdempotencyKey() })
      wx.navigateTo({ url: `/pages/creating/creating?taskId=${response.result.data.taskId}` })
    } catch (error) {
      console.error('创建创作任务失败:', error)
      showErrorToast(error, '创建创作任务失败，请稍后重试。')
    } finally {
      wx.hideLoading()
      this.setData({ submitting: false })
    }
  },

  onShareAppMessage() {
    return {
      title: '照片有话说，把此刻写下来',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return { title: '照片有话说，把此刻写下来' }
  }
})
