(function () {
    const resolveCircles = ["Circles", (Circles) => Circles.promise()];
    const circle = [
        "$route",
        "Circles",
        ($route, Circles) => {
            const circle_id = $route.current.params.circle_id;
            return Circles.promise().then((circles) => circles.by_key[circle_id]);
        },
    ];
    function registerRoutes($routeProvider) {
        const routes = [
            {
                path: "/public/unauthenticated",
                controller: UnauthenticatedController,
                templateUrl: p2k16_resources.unauthenticated_html,
            },
            {
                path: "/",
                controller: FrontPageController,
                templateUrl: p2k16_resources.front_page_html,
                resolve: {
                    recent_events: CoreDataServiceResolvers.recent_events,
                    membership_tiers: CoreDataServiceResolvers.membership_tiers,
                },
            },
            {
                path: "/about",
                controller: AboutController,
                templateUrl: p2k16_resources.about_html,
            },
            {
                path: "/my-profile",
                controller: MyProfileController,
                templateUrl: p2k16_resources.my_profile_html,
                resolve: {
                    badgeDescriptions: BadgeDataServiceResolvers.badge_descriptions,
                },
            },
            {
                path: "/tool",
                controller: ToolFrontPageController,
                templateUrl: p2k16_resources.tool_front_page_html,
                resolve: {
                    tools: ToolDataServiceResolvers.data_tool_list,
                    recent_events: ToolDataServiceResolvers.recent_events,
                },
            },
            {
                path: "/badges",
                controller: BadgesFrontPageController,
                templateUrl: p2k16_resources.badges_front_page_html,
                resolve: {
                    recentBadges: BadgeDataServiceResolvers.recent_badges,
                    badgeDescriptions: BadgeDataServiceResolvers.badge_descriptions,
                },
            },
            {
                path: "/user/:account_id",
                controller: UserDetailController,
                templateUrl: p2k16_resources.user_detail_html,
                resolve: {
                    summary: CoreDataServiceResolvers.data_account_summary,
                    badgeDescriptions: BadgeDataServiceResolvers.badge_descriptions,
                },
            },
            {
                path: "/admin",
                controller: AdminController,
                templateUrl: p2k16_resources.admin_html,
            },
            {
                path: "/admin/account",
                controller: AdminAccountListController,
                templateUrl: p2k16_resources.admin_account_list_html,
                resolve: {
                    profiles: CoreDataServiceResolvers.data_profile_summary_list,
                },
            },
            ...generateAdminRoutes(resolveCircles),
        ];

        routes.forEach((route) =>
            $routeProvider.when(route.path, {
                controller: route.controller,
                controllerAs: "ctrl",
                templateUrl: route.templateUrl,
                resolve: route.resolve,
            })
        );
        $routeProvider.otherwise("/");
    }
    function generateAdminRoutes(resolveCircles) {
        return [
            {
                path: "/admin/account/:account_id",
                controller: AdminAccountDetailController,
                templateUrl: p2k16_resources.admin_account_detail_html,
                resolve: {
                    account: CoreDataServiceResolvers.data_account,
                    circles: resolveCircles,
                },
            },
            {
                path: "/admin/company",
                controller: AdminCompanyListController,
                templateUrl: p2k16_resources.admin_company_list_html,
                resolve: { companies: CoreDataServiceResolvers.data_company_list },
            },
            {
                path: "/admin/circle",
                controller: AdminCircleListController,
                templateUrl: p2k16_resources.admin_circle_list_html,
                resolve: { circles: resolveCircles },
            },
            {
                path: "/admin/circle/new",
                controller: AdminCircleDetailController,
                templateUrl: p2k16_resources.admin_circle_detail_html,
                resolve: { circles: resolveCircles, circle: _.constant({}) },
            },
            {
                path: "/admin/circle/:circle_id",
                controller: AdminCircleDetailController,
                templateUrl: p2k16_resources.admin_circle_detail_html,
                resolve: {
                    circles: resolveCircles,
                    circle: CoreDataServiceResolvers.data_circle,
                },
            },
            {
                path: "/admin/company/new",
                controller: AdminCompanyDetailController,
                templateUrl: p2k16_resources.admin_company_detail_html,
                resolve: {
                    profiles: CoreDataServiceResolvers.data_profile_summary_list,
                    company: _.constant({ active: true }),
                },
            },
            {
                path: "/admin/company/:company_id",
                controller: AdminCompanyDetailController,
                templateUrl: p2k16_resources.admin_company_detail_html,
                resolve: {
                    profiles: CoreDataServiceResolvers.data_profile_summary_list,
                    company: CoreDataServiceResolvers.data_company,
                },
            },
            {
                path: "/admin/tool",
                controller: AdminToolListController,
                templateUrl: p2k16_resources.admin_tool_list_html,
                resolve: { tools: ToolDataServiceResolvers.data_tool_list },
            },
            {
                path: "/admin/tool/new",
                controller: AdminToolDetailController,
                templateUrl: p2k16_resources.admin_tool_detail_html,
                resolve: {
                    tools: ToolDataServiceResolvers.data_tool_list,
                    tool: _.constant({}),
                },
            },
            {
                path: "/admin/tool/:tool_id",
                controller: AdminToolDetailController,
                templateUrl: p2k16_resources.admin_tool_detail_html,
                resolve: {
                    tools: ToolDataServiceResolvers.data_tool_list,
                    tool: ToolDataServiceResolvers.data_tool,
                },
            },
        ];
    }

    function config($routeProvider, $httpProvider) {
        registerRoutes($routeProvider);
        $httpProvider.interceptors.push("P2k16HttpInterceptor");
        window.stripe = Stripe(window.stripe_pubkey);
    }

    function run(P2k16, $location, $rootScope) {
        $rootScope.$on("$locationChangeStart", () => {
            const path = $location.path();
            if (!path.startsWith("/public/") && !P2k16.isLoggedIn()) {
                $location.url("/public/unauthenticated");
            }
        });

        $rootScope.p2k16 = P2k16;
    }

    /**
     * @constructor
     */
    function P2k16Message(text, cssClass) {
        this.text = text;
        this.cssClass = cssClass;
    }

    /**
     * @constructor
     */
    function Log(name) {
        /**
         * @lends Log.prototype
         */
        return {
            d: (...args) => console.info(name, ...args),
            i: (...args) => console.debug(name, ...args),
        };
    }

    /**
     * A not so very smart cache of items.
     *
     * Exposes two read-only (not enforced) data structures:
     *  - "by_key": a key-index map
     *  - "values": an array of all values
     *
     * Values retrieved from the cache are always valid and only their contents will be replaced if they are
     * refreshed with new data.
     *
     * @constructor
     */
    function SmartCache($q, name, params) {
        const defaultMapper = (o) => ({ key: o.id, value: o });

        /**
         * @constructor
         */
        function Item(key, value, index) {
            this.key = key;
            this.value = value;
            this.index = index;
        }

        const mapper = params.mapper || defaultMapper;
        const log = new Log(`SmartCache:${name}`);
        const items = new Map();

        let itemCount = 0;
        const values = [];

        const remove = (value) => {
            const { key } = mapper(value);
            const item = items.get(key);
            if (item) {
                items.delete(key);
                values[item.index] = null;
            }
        };

        const put = (value) => {
            const { key, value: mappedValue } = mapper(value);
            let item = items.get(key);

            if (item) {
                log.d("Replacing existing item", key);
                Object.assign(item.value, mappedValue);
                return;
            }
            log.d("Creating new item", key);
            const newItem = new Item(key, {}, itemCount++);
            items.set(key, newItem);
            values[newItem.index] = newItem.value;
            Object.assign(newItem.value, mappedValue);
        };

        const promise = () => {
            const deferred = $q.defer();
            deferred.resolve(instance);
            return deferred.promise;
        };

        const executeControl = (control) => {
            log.d("Executing control", control.type);
            if (control.type === "replace-collection") {
                control.data.forEach((updated) => put(updated));
            }
        };


        /**
         *  @lends SmartCache instance
         */
        const instance = {
            promise,
            executeControl,
            put,
            remove,
            values,
            getName() {
                return name;
            },
        };

        return instance;
    }

    /**
     * @constructor
     */
    function Listeners($rootScope, key) {
        const self = this;
        self.args = [];

        const eventName = "Listeners-" + key;

        function add($scope, listener) {
            const destructor = $rootScope.$on(eventName, () => {
                listener.apply(null, self.args);
            });
            $scope.$on("$destroy", destructor);
        }

        function notify() {
            self.args = arguments;
            $rootScope.$emit(eventName);
            self.args = [];
        }

        /**
         * @lends Listeners.prototype
         */
        return {
            add,
            notify,
        };
    }

    /**
     * @param $rootScope
     * @param {SmartCache} Circles
     * @param {SmartCache} BadgeDescriptions
     * @param $timeout
     * @constructor
     */
    function P2k16($rootScope, Circles, BadgeDescriptions, $timeout) {
        const self = this;
        self.$rootScope = $rootScope;
        self.messages = [];
        self.profile = null;

        /**
         * @type {Listeners}
         */
        self.accountListeners = new Listeners($rootScope, "account");

        function isLoggedIn() {
            return !!self.profile;
        }

        function currentProfile() {
            return self.profile;
        }

        function currentAccount() {
            return self?.profile?.account;
        }

        function refreshAccount(updated) {
            _.merge(self.profile, updated);
            self.accountListeners.notify(self.profile);
        }

        function refreshAccountFromResponse(res) {
            return refreshAccount(res.data);
        }

        function isInCircle(circleName) {
            return (
                self.profile && Object.some(self.profile.circles, { name: circleName })
            );
        }

        function setLoggedIn(data) {
            self.profile = data || null;
        }

        function addMessages(messages, cssClass) {
            const add = (text) => {
                text = (typeof text === "string" ? text : "").trim();
                if (!text.length) {
                    return;
                }
                self.messages.push(new P2k16Message(text, cssClass));
                if (cssClass === "alert-info") {
                    $timeout(() => self.messages.dismissByText(text), 5000);
                }
            };

            if (typeof messages === "string") {
                add(messages, cssClass);
            } else {
                messages.forEach(add);
            }
        }

        function addErrors(messages) {
            addMessages(messages, "alert-danger");
        }

        function addInfos(messages) {
            addMessages(messages, "alert-info");
        }

        function canAdminCircle(circleId) {
            return self.circlesWithAdminAccess.includes(circleId);
        }

        if (window.p2k16.profile) {
            setLoggedIn(window.p2k16.profile);
        }

        self.circlesWithAdminAccess = window.p2k16.circlesWithAdminAccess || [];
        Circles.executeControl({
            type: "replace-collection",
            data: window.p2k16.circles || [],
        });
        BadgeDescriptions.executeControl({
            type: "replace-collection",
            data: window.p2k16.badgeDescriptions || [],
        });
        self.stripe_pubkey = window.p2k16.stripe_pubkey || "";

        window.p2k16 = undefined;

        self.messages.dismiss = (index) => self.messages.splice(index, 1);
        self.messages.dismissByText = (text) => {
            const idx = self.messages.findIndex((e) => e.text === text);
            self.messages.dismiss(idx);
        };

        return {
            isLoggedIn,
            currentProfile,
            currentAccount,
            refreshAccount,
            refreshAccountFromResponse,
            accountListeners: self.accountListeners,
            setLoggedIn,
            hasRole: isInCircle,
            addErrors,
            addInfos,
            stripe_pubkey: self.stripe_pubkey,
            messages: self.messages,
            canAdminCircle,
        };
    }

    /**
     * @param $http
     * @param {P2k16} P2k16
     * @param {CoreDataService} CoreDataService
     * @constructor
     */
    function AuthzService($http, P2k16, CoreDataService) {
        function logIn(form) {
            return $http
                .post("/service/authz/log-in", form)
                .then((res) => P2k16.setLoggedIn(res.data));
        }

        function logOut() {
            return CoreDataService.service_authz_logout().then(() =>
                P2k16.setLoggedIn(null)
            );
        }

        /**
         * @lends AuthzService.prototype
         */
        return {
            logIn,
            logOut,
        };
    }

    function p2k16HeaderDirective() {
        function p2k16HeaderController(
            $scope,
            $location,
            P2k16,
            AuthzService,
            CoreDataService
        ) {
            const self = this;
            self.currentProfile = P2k16.currentProfile;
            self.currentAccount = P2k16.currentAccount;

            self.logout = ($event) => {
                $event.preventDefault();
                AuthzService.logOut().then(() =>
                    $location.url("/?random=" + Date.now())
                );
            };

            self.manageBilling = () => {
                CoreDataService.membership_customer_portal({
                    baseUrl: window.location.origin,
                }).then((res) => {
                    window.location.href = res.data.portalUrl;
                });
            };

            $scope.isNavCollapsed = true;
            $scope.isCollapsed = false;
            $scope.isCollapsedHorizontal = false;
        }

        return {
            restrict: "E",
            scope: { active: "@" },
            controller: p2k16HeaderController,
            controllerAs: "header",
            templateUrl: p2k16_resources.p2k16_header_html,
        };
    }

    function p2k16EntityInfo() {
        return {
            restrict: "E",
            scope: { entity: "=" },
            controller: function () {
                this.show = (entity) =>
                    entity &&
                    entity.createdAt &&
                    entity.updatedAt &&
                    entity.createdAt.substring(0, 19) !==
                    entity.updatedAt.substring(0, 19);
            },
            controllerAs: "ctrl",
            template: `
                <p ng-if="entity.id" class="text-muted entity-info">
                    Created by {{ entity.createdBy }} at {{ entity.createdAt | date:'medium' }}
                    <span ng-if="ctrl.show(entity)">, last updated by {{ entity.updatedBy }} at {{ entity.updatedAt | date:'medium' }}</span>.
                </p>`,
        };
    }
    function P2k16HttpInterceptor(
        $rootScope,
        $q,
        P2k16,
        Circles,
        BadgeDescriptions
    ) {
        const findCollection = (name) => {
            if (name === "circles") return Circles;
            if (name === "badge-descriptions") return BadgeDescriptions;
        };

        return {
            response: (res) => {
                if (res && res.data && res.data._controls) {
                    res.data._controls.forEach((c) => {
                        const collection = findCollection(c.collection);
                        collection.executeControl(c);
                    });
                }
                return res;
            },
            responseError: (rejection) => {
                if (
                    rejection.headers("content-type") === "application/vnd.error+json" &&
                    rejection.data.message
                ) {
                    P2k16.addErrors(rejection.data.message);
                    return $q.defer().promise;
                }
                return $q.reject(rejection);
            },
        };
    }
    function YesNoFilter() {
        return (b) => (b ? "Yes" : "No");
    }

    /**
     * @param {DoorDataService} DoorDataService
     * @param {P2k16} P2k16
     * @param recent_events
     * @param membership_tiers
     */
    function FrontPageController(
        DoorDataService,
        P2k16,
        recent_events,
        membership_tiers,
        CoreDataService
    ) {
        const self = this;

        self.openDoors = (doors) => {
            DoorDataService.open_door({ doors }).then((res) => {
                const msg = res.message || "The door is open";
                P2k16.addInfos(msg);
            });
        };

        self.signup = (tier) => {
            const { priceId } = tier;
            CoreDataService.membership_create_checkout_session({
                baseUrl: window.location.origin,
                priceId,
            }).then((res) => {
                window.stripe.redirectToCheckout(res.data);
            });
        };

        self.manageBilling = () => {
            CoreDataService.membership_customer_portal({
                baseUrl: window.location.origin,
            }).then((res) => {
                window.location.href = res.data.portalUrl;
            });
        };

        self.retryPayment = () => {
            CoreDataService.membership_retry_payment().then(() => {
                setTimeout(() => window.location.reload(), 2000);
            });
        };

        const profile = P2k16.currentProfile();
        self.doorsAvailable = profile.has_door_access;
        self.availableDoors = profile.available_doors;
        self.payingMember = profile.is_paying_member;
        self.employed = profile.is_employed;

        self.membership_tiers = membership_tiers;
        self.recent_events = recent_events;

        self.pendingPayment = false;
        if (!profile.is_paying_member) {
            // For non-paying members, we should check if the user has unpaid invoices / an active subscription
            // This can happen if credit expires or unsufficient funds.
            // In this case, the signup should not be shown.
            CoreDataService.membership_status().then(function (res) {
                self.pendingPayment = res.data.subscription_active;
            });
        }
    }

    function AboutController() {
        this.gitRevision = window.gitRevision;
    }

    /**
     * @param $scope
     * @param {P2k16} P2k16
     * @param {CoreDataService} CoreDataService
     * @param badgeDescriptions
     * @param {LabelService} LabelService
     * @constructor
     */
    function MyProfileController(
        $scope,
        P2k16,
        CoreDataService,
        badgeDescriptions,
        LabelService
    ) {
        const self = this;

        P2k16.accountListeners.add($scope, (newValue) => {
            updateBadges(newValue);
            updateCircles(newValue);
        });

        const updateCircles = (account) =>
            (self.circles = Object.values(account.circles));
        const updateBadges = (account) =>
            (self.badges = Object.values(account.badges));

        self.changePassword = () => {
            CoreDataService.service_set_password(self.changePasswordForm).then(
                (res) => {
                    const msg = res.message || "Password changed";
                    P2k16.addInfos(msg);
                }
            );
        };

        self.changeUserName = () => {
            CoreDataService.service_set_username(self.profileForm).then(
                (res) => {
                    const msg = res.message || "Username Updated to:" + self.profileForm.username
                    P2k16.addInfos(msg);

                }
            )
        };

        self.printBoxLabel = () => {
            LabelService.print_box_label({ user: P2k16.currentAccount().id }).then(
                (res) => {
                    const msg = res.message || "Label sent to printer";
                    P2k16.addInfos(msg);
                }
            );
        };

        self.saveProfile = () => {
            CoreDataService.service_edit_profile(self.profileForm).then((res) => {
                const msg = res.message || "Profile saved";
                P2k16.addInfos(msg);
            });
        };

        self.getCurrentStatus = () => {
            LabelService.get_label_active()
                .then((res) => {
                    self.isLabelActive = res.data.status;
                    $scope.$applyAsync();
                })
                .catch((error) =>
                    console.error("Error getting current label status:", error)
                );
        };

        self.badges = [];
        self.circles = [];
        self.newBadge = {};
        self.descriptions = badgeDescriptions;
        self.changePasswordForm = {};
        self.changeUserNameForm = {}
        self.profileForm = { phone: P2k16.currentProfile().account.phone, username: P2k16.currentProfile().account.username };
        self.isLabelActive = false;
        updateBadges(P2k16.currentProfile());
        updateCircles(P2k16.currentProfile());
        self.getCurrentStatus();
    }

    function ToolFrontPageController(
        ToolDataService,
        $scope,
        P2k16,
        tools,
        recent_events
    ) {
        const self = this;

        const update = (data) => {
            self.tools = data;
            self.my_tools = self.tools.filter(
                (tool) => tool.checkout.account == self.my_account
            );
        };

        self.debounce = 0;
        self.recent_events = recent_events;
        self.my_account = P2k16.currentAccount().id;
        update(tools);

        const debounce = (func, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        };

        const checkoutTool = (tool) => {
            ToolDataService.checkout_tool({ tool: tool.id }).then((res) =>
                update(res.data)
            );
        };

        const checkinTool = (tool) => {
            ToolDataService.checkin_tool({ tool: tool.id }).then((res) =>
                update(res.data)
            );
        };

        self.checkoutToolConfirm = (tool) => {
            if (
                window.confirm(
                    `Do you really want to checkout ${tool.name}? This may destroy a job in progress!`
                )
            ) {
                debounce(checkoutTool, 300)(tool);
            }
        };

        self.checkoutTool = debounce(checkoutTool, 300);
        self.checkinTool = debounce(checkinTool, 300);
    }
    /*************************************************************************
     * Badges
     */

    /**
     * @param {CoreDataService} CoreDataService
     * @param {BadgeDataService} BadgeDataService
     * @param {P2k16} P2k16
     * @param badgeDescriptions
     * @param recentBadges
     */
    function BadgesFrontPageController(
        CoreDataService,
        BadgeDataService,
        P2k16,
        badgeDescriptions,
        recentBadges
    ) {
        const self = this;
        self.badgeDescriptions = badgeDescriptions;
        self.recentBadges = recentBadges;

        // Initialize the userList as an empty array
        self.userList = [];

        // Fetch the user list and update self.userList when resolved
        CoreDataService.userlist().then((res) => {
            self.userList = res.data;
        });

        self.getUser = () => {
            return P2k16.currentAccount().name || "";
        };

        self.badgeList = [];

        self.getBadgeList = () => {
            self.badgeList = Object.values(badgeDescriptions).map(badge => badge.title);
            return self.badgeList;
        };

        self.getUserList = () => {
            console.log(self.userList); // This will log the resolved user list
            return self.userList;
        };

        self.createBadge = () => {
            BadgeDataService.create(self.newBadge).then(
                P2k16.refreshAccountFromResponse
            );
        };
    }

    /*************************************************************************
     * User
     */

    /**
     * @param {CoreDataService} CoreDataService
     * @param {BadgeDataService} BadgeDataService
     * @param {P2k16} P2k16
     * @param summary
     * @param badgeDescriptions
     */
    function UserDetailController(
        CoreDataService,
        BadgeDataService,
        P2k16,
        summary,
        badgeDescriptions
    ) {
        const self = this;
        self.account = summary.account;
        self.badges = summary.badges;
        self.summary = summary;
        self.badgeDescriptions = badgeDescriptions;
    }

    /*************************************************************************
     * Admin
     */

    /**
     * @constructor
     */
    function AdminController() { }

    /**
     * @param {CoreDataService} CoreDataService
     * @param profiles
     * @constructor
     */
    function AdminAccountListController(CoreDataService, profiles) {
        const self = this;
        self.profiles = profiles;
    }

    /**
     * @param $http
     * @param {CoreDataService} CoreDataService
     * @param account
     * @param {SmartCache} circles
     * @constructor
     */
    function AdminAccountDetailController(
        $http,
        CoreDataService,
        account,
        circles
    ) {
        var self = this;

        self.account = account;
        self.circles = circles.values.filter((circle) =>
            circle.memberIds.includes(self.account.id)
        );

        self.comment = "";
    }

    /**
     * @param companies
     * @constructor
     */
    function AdminCompanyListController(companies) {
        const self = this;
        self.companies = companies;
    }

    /**
     * @param {CoreDataService} CoreDataService
     * @param {SmartCache} circles
     * @constructor
     */
    function AdminCircleListController(CoreDataService, circles) {
        const self = this;
        self.circles = circles.values;
    }

    /**
     * @param $location
     * @param $uibModal
     * @param {CoreDataService} CoreDataService
     * @param {SmartCache} circles
     * @param circle
     * @constructor
     */
    function AdminCircleDetailController(
        $location,
        $uibModal,
        CoreDataService,
        circles,
        circle
    ) {
        const self = this;
        self.isNew = !circle.id;
        self.circleName = circle.id ? circle.name : "New circle";
        self.addCircleForm = { commentRequiredForMembership: false };
        self.addMemberForm = { username: "", comment: "" };

        const update = (data) => {
            self.circle = data;
            if (!self.members) self.members = [];
            if (data._embedded) {
                const { members } = data._embedded;
                delete data._embedded;
                self.members.length = 0;
                self.members.push(...members);
            }

            if (self.circle.adminCircle) {
                self.adminCircle = circles[self.circle.adminCircle];
            }
        };

        update(circle);

        self.createCircle = () =>
            CoreDataService.create_circle(self.addCircleForm).then((res) =>
                $location.url("/admin/circle/" + res.data.id)
            );

        self.removeMember = (accountId) => {
            const form = {
                accountId: accountId,
                circleId: self.circle.id,
            };
            CoreDataService.remove_account_from_circle(form).then((res) =>
                update(res.data)
            );
        };

        self.addMember = () => {
            const form = {
                accountUsername: self.addMemberForm.username,
                circleId: self.circle.id,
                comment: self.addMemberForm.comment,
            };
            self.addMemberForm.username = ""; // Keep the comment to make it easier to do bulk adds
            CoreDataService.add_account_to_circle(form).then((res) =>
                update(res.data)
            );
        };

        self.removeCircle = (circle) => {
            $uibModal
                .open({
                    animation: true,
                    templateUrl: "admin-circle-detail/remove-circle-modal.html",
                    controller: function ($uibModalInstance) {
                        const self = this;
                        self.ok = () => $uibModalInstance.close(circle);
                        self.cancel = () => $uibModalInstance.dismiss("cancel");
                    },
                    controllerAs: "ctrl",
                })
                .result.then(
                    () => {
                        CoreDataService.remove_circle(circle.id).then(() => {
                            circles.remove(circle);
                            $location.url("/admin/circle");
                        });
                    },
                    () => console.log("Remove aborted")
                );
        };

        self.selfAdminSelected = () => {
            if (
                !self.addCircleForm.comment &&
                self.addCircleForm.commentRequiredForMembership
            ) {
                self.addCircleForm.comment = "Initial admin";
            }
        };
    }

    /**
     * @param $location
     * @param profiles
     * @param company
     * @param {CoreDataService} CoreDataService
     * @constructor
     */
    function AdminCompanyDetailController(
        $location,
        profiles,
        company,
        CoreDataService
    ) {
        const self = this;
        let isNew;

        self.profiles = profiles;

        const setCompany = (company) => {
            self.company = angular.copy(company);
            isNew = !self.company.id;
            self.title = isNew ? "New company" : self.company.name;
        };

        setCompany(company);

        self.save = () => {
            const q = self.company.id
                ? CoreDataService.data_company_update(self.company)
                : CoreDataService.data_company_add(self.company);

            q.then((res) => {
                if (isNew) {
                    $location.url("/admin/company/" + res.data.id);
                } else {
                    setCompany(res.data);
                    self.form.$setPristine();
                }
            });
        };

        self.existingEmployeeFilter = (profile) => {
            const targetUsername = profile.account.username;
            return !self.company.employees.some(
                (employee) => employee.account.username === targetUsername
            );
        };

        self.removeEmployee = (event, employee) => {
            event.preventDefault();
            CoreDataService.data_company_remove_employee(company.id, {
                accountId: employee.account_id,
            }).then((res) => setCompany(res.data));
        };

        self.addEmployee = (event, profile) => {
            event.preventDefault();
            self.query = "";
            CoreDataService.data_company_add_employee(company.id, {
                accountId: profile.account.id,
            }).then((res) => setCompany(res.data));
        };
    }

    /**
     * @param {ToolDataService} ToolDataService
     * @param {SmartCache} tools
     * @constructor
     */
    function AdminToolListController(ToolDataService, tools) {
        let self = this;
        self.tools = tools;
    }

    function AdminToolDetailController($location, ToolDataService, tools, tool) {
        const self = this;
        self.isNew = !tool.id;

        const setTool = (tool) => {
            self.tool = angular.copy(tool);
            isNew = !self.tool.id;
            self.title = isNew ? "New tool" : self.tool.name;
        };

        setTool(tool);

        self.save = () => {
            const q = self.tool.id
                ? ToolDataService.data_tool_update(self.tool)
                : ToolDataService.data_tool_add(self.tool);

            q.then((res) => {
                if (isNew) {
                    $location.url("/admin/tool/" + res.data.id);
                } else {
                    setTool(res.data);
                    self.form.$setPristine();
                }
            });
        };
    }

    /**
     * @param $location
     * @param $uibModal
     * @param {P2k16} P2k16
     * @param {CoreDataService} CoreDataService
     * @param {AuthzService} AuthzService
     * @constructor
     */
    function UnauthenticatedController(
        $location,
        $window,
        $uibModal,
        P2k16,
        CoreDataService,
        AuthzService
    ) {
        const self = this;
        self.signupForm = {};
        self.loginForm = { username: null, password: null };
        self.showSignUpForm = false;

        self.registerAccount = () => {
            CoreDataService.register_account(self.signupForm).then(() => {
                self.signupForm = {};
                P2k16.addInfos("Account created, please log in.");
            });
        };

        self.logIn = () => {
            AuthzService.logIn(self.loginForm).then(() => {
                $window.location.href = "/";
            });
        };

        self.toggleSignupForm = () => (self.showSignUpForm = !self.showSignUpForm);

        self.resetPassword = () => {
            const username = self.loginForm.username;
            const modalInstance = $uibModal.open({
                animation: true,
                templateUrl: "unauthenticated/reset-password-modal.html",
                controller: function ($uibModalInstance) {
                    const self = this;
                    self.username = username;
                    self.ok = () => {
                        CoreDataService.service_start_reset_password({
                            username: self.username,
                        }).then((res) => {
                            self.message = res.data.message;
                        });
                    };
                    self.dismiss = () => $uibModalInstance.dismiss("dismissed");
                    self.cancel = () => $uibModalInstance.dismiss("cancel");
                },
                controllerAs: "ctrl",
            });

            modalInstance.result.then((values) => { }, angular.identity);
        };
    }

    function valueMapper(entity) {
        entity._embedded = undefined;
        return { key: entity.id, value: entity };
    }

    function configSmartCaches($provide) {
        $provide.factory("Circles", [
            "$q",
            ($q) => new SmartCache($q, "Circle", valueMapper),
        ]);
        $provide.factory("BadgeDescriptions", [
            "$q",
            ($q) => new SmartCache($q, "BadgeDescription", valueMapper),
        ]);
    }

    angular
        .module("p2k16.app", ["ngRoute", "ui.bootstrap"])
        .config(configSmartCaches)
        .config(config)
        .run(run)
        .service("P2k16", P2k16)
        .service("BadgeDataService", BadgeDataService)
        .service("CoreDataService", CoreDataService)
        .service("DoorDataService", DoorDataService)
        .service("ToolDataService", ToolDataService)
        .service("LabelService", LabelService)
        .service("AuthzService", AuthzService)
        .service("P2k16HttpInterceptor", P2k16HttpInterceptor)
        .filter("yesno", YesNoFilter)
        .directive("p2k16Header", p2k16HeaderDirective)
        .directive("p2k16EntityInfo", p2k16EntityInfo);
})();
