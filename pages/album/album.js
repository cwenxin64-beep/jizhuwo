const BASE_MEMORIES = [
  {
    title: '冬至的暖手炉',
    tag: '形象记录',
    tone: 'warm',
    badge: 'pink',
    image: '/assets/album/winter.jpg',
    copy: '那天很冷，布丁却一直贴在脚边，像一个会呼吸的小暖炉。'
  },
  {
    title: '午后花园探险',
    tag: '成长足迹',
    tone: 'garden',
    badge: '',
    image: '/assets/album/garden.jpg',
    copy: '它在花丛前停了很久，像是发现了只属于自己的秘密。'
  },
  {
    title: '同一片星光',
    tag: '形象记录',
    tone: 'star',
    badge: 'blue',
    image: '/assets/album/starlight.jpg',
    copy: '窗外的星星亮起来时，它总会安静地趴在身边。'
  },
  {
    title: '雨天的守望',
    tag: '成长足迹',
    tone: 'rain',
    badge: '',
    image: '/assets/album/rain.jpg',
    copy: '雨停以后，小路上有湿漉漉的叶子，也有它留下的脚印。'
  },
  {
    title: '最爱的肉干卷',
    tag: '形象记录',
    tone: 'warm',
    badge: 'pink',
    image: '/assets/album/meat-roll.jpg',
    copy: '只要闻到熟悉的香气，布丁的眼睛就会马上亮起来。'
  }
];

Page({
  data: {
    layout: getApp().globalData.layout,
    filters: ['全部回忆', '形象记录', '成长足迹'],
    activeFilter: '全部回忆',
    selectedMemory: null,
    memories: BASE_MEMORIES,
    visibleMemories: BASE_MEMORIES
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 1, hidden: false });
    const careRecords = wx.getStorageSync('bathCareRecords') || [];
    const baseMemories = this.data.memories.filter((item) => item.source !== 'bath');
    const latestCare = careRecords[0];
    const memories = latestCare
      ? [{
        title: '洗得香香的一天',
        tag: '成长足迹',
        tone: 'warm',
        badge: 'blue',
        image: '/assets/album/bath-memory.jpg',
        source: 'bath',
        copy: latestCare.memoryText
      }, ...baseMemories]
      : baseMemories;
    const visibleMemories = this.data.activeFilter === '全部回忆'
      ? memories
      : memories.filter((item) => item.tag === this.data.activeFilter);
    this.setData({ memories, visibleMemories });
  },
  goLab() {
    wx.navigateTo({ url: '/pages/lab/lab' });
  },
  chooseFilter(event) {
    const activeFilter = event.currentTarget.dataset.name;
    if (activeFilter === '形象记录') {
      wx.navigateTo({ url: '/pages/lab/lab' });
      return;
    }
    const visibleMemories = activeFilter === '全部回忆'
      ? this.data.memories
      : this.data.memories.filter((item) => item.tag === activeFilter);
    this.setData({
      activeFilter,
      visibleMemories,
      selectedMemory: null
    });
  },
  openMemory(event) {
    const selectedMemory = this.data.visibleMemories[Number(event.currentTarget.dataset.index)];
    if (!selectedMemory) return;
    this.setData({ selectedMemory });
  },
  closeMemory() {
    this.setData({ selectedMemory: null });
  }
});
