const { uploadFileWithTimeout, callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')
const { ALLOWED_IMAGE_EXTENSIONS, getImageExtensionFromPath } = require('../../utils/image')
const { requirePrivacyAuthorization } = require('../../utils/privacy')

const MAX_FILE_SIZE = 6 * 1024 * 1024
const PREPARE_TIMEOUT = 30000
const HEIC_EXTENSIONS = new Set(['heic', 'heif'])

const generateTypes = [
  { value: 'poem', title: '五言绝句', description: '把此刻写成一首诗' },
  { value: 'review', title: '图评', description: '读出照片里的故事' },
  { value: 'copy', title: '文案', description: '生成可直接分享的文字' }
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
    wx.hideLoading()
  },

  async chooseImage() {
    if (this.data.preparing || this.data.submitting) return

    const prepareRunId = (this.prepareRunId || 0) + 1
    this.prepareRunId = prepareRunId
    const isCurrentRun = () => this.prepareRunId === prepareRunId
    let loadingShown = false
    let stagingFileId = ''
    const cleanupStagingFile = async () => {
      if (!stagingFileId) return
      const fileId = stagingFileId
      stagingFileId = ''
      try {
        await wx.cloud.deleteFile({ fileList: [fileId] })
      } catch (cleanupError) {
        console.warn('回收暂存图片失败:', cleanupError)
      }
    }
    try {
      await requirePrivacyAuthorization()
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
      const file = selection.tempFiles?.[0]
      const tempFilePath = file?.tempFilePath || ''
      if (!tempFilePath) throw new Error('未获取到图片路径')
      if (!isCurrentRun()) return
      if (file.size > MAX_FILE_SIZE) throw new Error('图片过大，请选择 6MB 以内的图片。')

      let extension = ''
      try {
        extension = await getImageExtension(tempFilePath)
      } catch (error) {
        console.warn('客户端图片格式识别失败，将由云端继续校验：', error)
      }
      if (HEIC_EXTENSIONS.has(extension)) {
        wx.showModal({
          title: '暂不支持 HEIC 图片',
          content: '请先将照片导出为 JPG，或在 iPhone「设置－相机－格式」中选择“兼容性最佳”后再拍摄。',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }
      if (!extension) throw new Error('暂不支持这种图片格式，请选择 JPG、PNG 或 WebP。')
      if (!isCurrentRun()) return

      this.setData({
        imageUrl: tempFilePath,
        assetId: '',
        idempotencyKey: '',
        prepareState: 'pending',
        preparing: true,
        prepareMessage: '正在创建上传任务…'
      })
      wx.showLoading({ title: '正在创建上传任务…', mask: true })
      loadingShown = true

      const uploadTicket = await callFunctionWithTimeout('createImageUpload', { extension })
      if (!isCurrentRun()) return
      if (!uploadTicket.result?.ok) {
        console.error('createImageUpload 返回失败:', uploadTicket.result)
        throw new Error(getFailureMessage(uploadTicket.result, '创建上传任务失败，请稍后重试。'))
      }
      const { assetId, stagingPath } = uploadTicket.result.data
      this.setData({ prepareMessage: '正在上传照片…' })
      wx.showLoading({ title: '正在上传照片…', mask: true })
      const upload = await uploadFileWithTimeout(stagingPath, tempFilePath)
      stagingFileId = upload.fileID
      if (!isCurrentRun()) {
        await cleanupStagingFile()
        return
      }
      this.setData({ prepareMessage: '正在优化图片…' })
      wx.showLoading({ title: '正在优化图片…', mask: true })
      const response = await callFunctionWithTimeout('prepareImage', { assetId, fileID: upload.fileID }, PREPARE_TIMEOUT)
      if (!response.result?.ok) throw new Error(getFailureMessage(response.result, '图片处理失败，请换一张再试。'))
      stagingFileId = ''
      if (!isCurrentRun()) return

      this.setData({
        assetId,
        idempotencyKey: createIdempotencyKey(),
        prepareState: 'ready',
        prepareMessage: '图片已准备好'
      })
    } catch (error) {
      if (error?.errMsg?.includes('cancel')) return
      await cleanupStagingFile()
      if (!isCurrentRun()) return
      console.error('上传并处理图片失败:', error)
      this.setData({ assetId: '', prepareState: 'error', prepareMessage: '' })
      showErrorToast(error, '图片处理失败，请换一张再试。')
    } finally {
      // 用户在系统选图界面取消时，尚未显示 loading；此时不能调用 hideLoading。
      if (!isCurrentRun()) return
      if (loadingShown) wx.hideLoading()
      this.setData({ preparing: false })
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
