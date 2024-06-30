function BadgeDataService($http) {
  this.badge_descriptions = function () {
    return $http.get('/badge/badge-descriptions');
  };

  this.create = function (payload) {
    return $http.post('/badge/create-badge', payload);
  };

  this.recent_badges = function () {
    return $http.get('/badge/recent-badges');
  };

  this.badges_for_user = function (account_id) {
    return $http.get(`/badge/badges-for-user/${account_id}`);
  };

  this.delete_badge = function (desc) {
    return $http.delete('/badge/remove-badge', { data: { title: desc } });
  };
}

var BadgeDataServiceResolvers = {
  badge_descriptions: function (BadgeDataService) {
    return BadgeDataService.badge_descriptions().then(function (res) { return res.data; });
  },
  recent_badges: function (BadgeDataService) {
    return BadgeDataService.recent_badges().then(function (res) { return res.data; });
  },
  badges_for_user: function (BadgeDataService, $route) {
    var account_id = $route.current.params.account_id;
    return BadgeDataService.badges_for_user(account_id).then(function (res) { return res.data; });
  }
}
