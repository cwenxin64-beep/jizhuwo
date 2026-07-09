Page({
  data: {
    layout: getApp().globalData.layout,
    photoPath: '',
    resultImage: '',
    resultFileID: '',
    uploadTitle: '点击上传照片',
    uploadNote: '支持 JPG、PNG 格式',
    generateText: '✧ 开始生成',
    generating: false,
    resultVisible: false,
    activeTone: '',
    resultTitle: '星光里的布丁',
    resultCopy: '生成后的纪念形象会保留温暖眼神和柔和轮廓。',
    styles: [
      { id: 'warm-oil', title: '温暖油画', active: true, tone: '' },
      { id: 'healing-illustration', title: '治愈插画', active: false, tone: 'blue' },
      { id: 'fairy-3d', title: '3D', active: false, tone: 'toy' }
    ]
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ hidden: true });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/album/album' });
  },
  choosePhoto() {
    if (this.data.generating) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
          wx.showModal({
            title: '照片太大',
            content: '请选择小于 20MB 的照片。',
            showCancel: false
          });
          return;
        }
        this.setData({
          photoPath: file.tempFilePath,
          uploadTitle: '照片已放入实验室',
          uploadNote: '可以选择喜欢的纪念风格',
          resultVisible: false,
          resultImage: '',
          resultFileID: ''
        });
      }
    });
  },
  chooseStyle(event) {
    const index = Number(event.currentTarget.dataset.index);
    const styles = this.data.styles.map((item, itemIndex) => ({
      ...item,
      active: itemIndex === index
    }));
    this.setData({
      styles,
      activeTone: styles[index].tone,
      resultVisible: false,
      resultImage: '',
      resultFileID: ''
    });
  },
  async createImage() {
    if (this.data.generating) return;
    if (!this.data.photoPath) {
      wx.showToast({
        title: '请先上传照片',
        icon: 'none'
      });
      return;
    }
    if (!wx.cloud) {
      wx.showModal({
        title: '云服务不可用',
        content: '请升级微信后重新尝试。',
        showCancel: false
      });
      return;
    }

    const activeStyle = this.data.styles.find((item) => item.active) || this.data.styles[0];
    this.setData({
      generating: true,
      generateText: '正在上传照片...',
      resultVisible: false,
      resultImage: '',
      resultFileID: ''
    });

    try {
      const extension = this.getImageExtension(this.data.photoPath);
      const random = Math.random().toString(36).slice(2, 10);
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `ai-inputs/${Date.now()}-${random}.${extension}`,
        filePath: this.data.photoPath
      });

      this.setData({
        generateText: '正在描绘纪念形象...'
      });

      const callResult = await wx.cloud.callFunction({
        name: 'generatePetImage',
        data: {
          sourceFileID: uploadResult.fileID,
          style: activeStyle.id
        }
      });
      const result = callResult.result;

      if (!result || !result.ok || !result.tempFileURL) {
        throw new Error((result && result.message) || '生成服务没有返回图片');
      }

      this.setData({
        resultVisible: true,
        resultImage: result.tempFileURL,
        resultFileID: result.fileID,
        activeTone: activeStyle.tone,
        resultTitle: `${activeStyle.title}里的布丁`,
        resultCopy: '一张带着烛光、花朵与星光的纪念形象已经准备好。'
      });
      wx.showToast({
        title: '生成完成',
        icon: 'success'
      });
    } catch (error) {
      console.error('形象生成失败', error);
      wx.showModal({
        title: '生成失败',
        content: this.getErrorMessage(error),
        showCancel: false
      });
    } finally {
      this.setData({
        generating: false,
        generateText: this.data.resultVisible ? '✧ 再生成一次' : '✧ 开始生成'
      });
    }
  },
  previewResult() {
    if (!this.data.resultImage) return;
    wx.previewImage({
      current: this.data.resultImage,
      urls: [this.data.resultImage]
    });
  },
  getImageExtension(filePath) {
    const match = String(filePath).toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/);
    const extension = match ? match[1] : 'jpg';
    return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
  },
  getErrorMessage(error) {
    const message = String((error && (error.message || error.errMsg)) || '');
    if (message.includes('ARK_API_KEY')) {
      return '云函数还没有配置图片生成密钥，请在 CloudBase 中配置后重试。';
    }
    if (message.includes('function not exists') || message.includes('FUNCTIONS_EXECUTE_FAIL')) {
      return '云函数尚未部署，请先部署 generatePetImage。';
    }
    if (message.includes('timeout') || message.includes('超时')) {
      return '生成时间超过限制，请稍后重新尝试。';
    }
    return message || '图片生成失败，请稍后重新尝试。';
  },
  onUnload() {
    this.setData({ generating: false });
  }
});
