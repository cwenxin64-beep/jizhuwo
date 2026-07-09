Component({
  data: {
    selected: 0,
    hidden: true,
    list: [
      {
        pagePath: '/pages/home/home',
        text: '陪伴',
        icon: '/assets/navigation/home.svg',
        activeIcon: '/assets/navigation/home-active.svg'
      },
      {
        pagePath: '/pages/album/album',
        text: '档案',
        icon: '/assets/navigation/album.svg',
        activeIcon: '/assets/navigation/album-active.svg'
      },
      {
        pagePath: '/pages/market/market',
        text: '集市',
        icon: '/assets/navigation/market.svg',
        activeIcon: '/assets/navigation/market-active.svg'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: '/assets/navigation/profile.svg',
        activeIcon: '/assets/navigation/profile-active.svg'
      }
    ]
  },
  lifetimes: {
    attached() {
      this.syncRoute();
    }
  },
  pageLifetimes: {
    show() {
      this.syncRoute();
    }
  },
  methods: {
    syncRoute() {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const route = current && current.route;
      const routeState = {
        'pages/home/home': { selected: 0, hidden: true },
        'pages/album/album': { selected: 1, hidden: false },
        'pages/market/market': { selected: 2, hidden: false },
        'pages/profile/profile': { selected: 3, hidden: false }
      };
      if (routeState[route]) {
        this.setData(routeState[route]);
      }
    },
    switchTab(event) {
      const { index, path } = event.currentTarget.dataset;
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    }
  }
});
