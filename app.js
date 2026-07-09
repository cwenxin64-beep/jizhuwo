function buildLayout() {
  const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
  const rpx = (windowInfo.windowWidth || 375) / 750;
  const safeBottom = windowInfo.safeArea && windowInfo.screenHeight
    ? Math.max(windowInfo.screenHeight - windowInfo.safeArea.bottom, 0)
    : 0;
  const pageTop = menu && menu.bottom
    ? menu.bottom + 10
    : (windowInfo.statusBarHeight || 24) + 52 * rpx;

  return {
    pageTop,
    homeTop: pageTop,
    homeBottom: safeBottom,
    pageBottom: safeBottom + 48 * rpx,
    tabPageBottom: safeBottom + 190 * rpx,
    fakeTabBottom: safeBottom + 202 * rpx
  };
}

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前微信基础库不支持云开发，请升级后重试');
      return;
    }

    wx.cloud.init({
      traceUser: true
    });
  },
  globalData: {
    appName: '请记住我 Recuérdame',
    layout: buildLayout()
  }
});
