sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/core/routing/HashChanger",
    "zgsp26/conf/request/confrequestapp/ext/notification/NotificationService",
  ],
  function (Controller, JSONModel, MessageToast, Fragment, HashChanger, NotificationService) {
    "use strict";

    var STATUS_MAP = {
      DRAFT:       { text: "Draft",            state: "None",    icon: "sap-icon://edit"       },
      SUBMITTED:   { text: "Pending Approval", state: "Warning", icon: "sap-icon://pending"    },
      APPROVED:    { text: "Approved",         state: "Success", icon: "sap-icon://accept"     },
      REJECTED:    { text: "Rejected",         state: "Error",   icon: "sap-icon://decline"    },
      ROLLED_BACK: { text: "Rolled Back",      state: "Warning", icon: "sap-icon://undo"       },
      ACTIVE:      { text: "Active",           state: "Success", icon: "sap-icon://sys-enter-2"},
      DEPLOYED:    { text: "Deployed",         state: "Success", icon: "sap-icon://upload"     },
    };

    function _getSapClient() {
      return new URLSearchParams(window.location.search).get("sap-client") || "324";
    }

    function _formatDate(sVal) {
      if (!sVal) return "–";
      try {
        var d = new Date(sVal);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } catch (e) { return sVal; }
    }

    function _mapRow(oItem) {
      var st = STATUS_MAP[oItem.Status] || { text: oItem.Status, state: "None", icon: "" };
      return {
        ReqId:         oItem.ReqId,
        ReqTitle:      oItem.ReqTitle || oItem.Title || "–",
        ModuleId:      oItem.ModuleId || "–",
        EnvId:         oItem.EnvId || "–",
        Status:        oItem.Status,
        StatusText:    st.text,
        StatusState:   st.state,
        StatusIcon:    st.icon,
        CreatedAtText: _formatDate(oItem.CreatedAt),
        _raw:          oItem,
      };
    }

    return Controller.extend("zgsp26.conf.request.confrequestapp.ext.dashboard.Dashboard", {

      onInit: function () {
        // If navigated here with a ConfId (from Catalog app), redirect to CatalogLanding route
        var sConfId = this._getConfIdParam();
        if (sConfId) {
          this.getView().setVisible(false);
          HashChanger.getInstance().setHash("catalog");
          return;
        }

        var oModel = new JSONModel({
          loading: true,
          kpi: { total: 0, submitted: 0, approved: 0, rejected: 0, draft: 0 },
          requests: [],
          allRequests: [],
          activeFilter: "ALL",
        });
        this.getView().setModel(oModel, "dash");

        // ── Notification service ─────────────────────────────────────────
        var sClient = _getSapClient();
        var oNotifModel = NotificationService.init(sClient);
        this.getView().setModel(oNotifModel, "notif");

        // Sync badge whenever unreadCount changes — use interval as fallback
        // because attachPropertyChange path matching is unreliable across UI5 versions
        oNotifModel.attachPropertyChange(function () {
          this._syncBellBadge();
        }, this);

        // Fallback: re-sync every 2s to catch any missed updates
        this._iBadgeTimer = setInterval(function () {
          this._syncBellBadge();
        }.bind(this), 2000);

        this._loadData();
      },

      _getConfIdParam: function () {
        try {
          var oComp = this.getOwnerComponent && this.getOwnerComponent();
          var oCD   = oComp && oComp.getComponentData && oComp.getComponentData();
          if (oCD && oCD.startupParameters && oCD.startupParameters.ConfId) {
            return oCD.startupParameters.ConfId[0] || "";
          }
        } catch (e) { /* ignore */ }
        var sHash = window.location.hash;
        if (sHash.indexOf("?") > -1) {
          return new URLSearchParams(sHash.substring(sHash.indexOf("?"))).get("ConfId") || "";
        }
        return new URLSearchParams(window.location.search).get("ConfId") || "";
      },

      onExit: function () {
        if (this._iBadgeTimer) { clearInterval(this._iBadgeTimer); }
        NotificationService.destroy();
      },

      // ── Bell badge (CSS-based counter) ───────────────────────────────
      _syncBellBadge: function () {
        var oNotifModel = this.getView().getModel("notif");
        if (!oNotifModel) return;
        var iCount = oNotifModel.getProperty("/unreadCount") || 0;
        var oBell  = this.byId("notifBellBtn");
        if (!oBell) return;
        // Retry once after tick if DOM not yet mounted (DynamicPageTitle renders late)
        var oDom = oBell.getDomRef();
        if (!oDom) {
          setTimeout(function () {
            var oDom2 = oBell.getDomRef();
            if (!oDom2) return;
            oDom2.setAttribute("data-notif-count", iCount > 0 ? (iCount > 99 ? "99+" : String(iCount)) : "");
            oDom2.classList.toggle("confNotifBellActive", iCount > 0);
          }, 300);
          return;
        }
        oDom.setAttribute("data-notif-count", iCount > 0 ? (iCount > 99 ? "99+" : String(iCount)) : "");
        oDom.classList.toggle("confNotifBellActive", iCount > 0);
      },

      // ── Bell press → open popover ────────────────────────────────────
      onNotifBellPress: function (oEvent) {
        var oBtn  = oEvent.getSource();
        var oView = this.getView();
        if (!this._oNotifPopover) {
          Fragment.load({
            id:         oView.getId(),
            name:       "zgsp26.conf.request.confrequestapp.ext.notification.NotificationPopover",
            controller: this,
          }).then(function (oPopover) {
            this._oNotifPopover = oPopover;
            oView.addDependent(oPopover);
            oPopover.openBy(oBtn);
            this._scrollNotifToTop();
          }.bind(this));
        } else {
          this._oNotifPopover.openBy(oBtn);
          this._scrollNotifToTop();
        }
      },

      _scrollNotifToTop: function () {
        var oList = this.byId("notifList");
        if (!oList) return;
        // Wait one tick for the popover DOM to be fully rendered
        setTimeout(function () {
          var oDomRef = oList.getDomRef();
          if (oDomRef) { oDomRef.scrollTop = 0; }
          // Also scroll the popover's scroll container
          var oScroller = oList.$().closest(".sapMPopoverCont, .sapMScrollCont")[0];
          if (oScroller) { oScroller.scrollTop = 0; }
        }, 50);
      },

      onNotifPopoverClose: function () {
        // nothing extra needed
      },

      onMarkAllRead: function () {
        NotificationService.markAllRead();
        this._syncBellBadge();
      },

      onClearAllNotif: function () {
        NotificationService.clearAll();
        this._syncBellBadge();
      },

      onNotifItemPress: function (oEvent) {
        var oCtx  = oEvent.getSource().getBindingContext("notif");
        if (!oCtx) return;
        var sId    = oCtx.getProperty("id");
        var sReqId = oCtx.getProperty("ReqId");
        var sEnvId = oCtx.getProperty("EnvId") || "DEV";
        NotificationService.markRead(sId);
        this._syncBellBadge();
        if (this._oNotifPopover) { this._oNotifPopover.close(); }
        if (sReqId) {
          this.getOwnerComponent().getRouter().navTo("ZC_CONF_REQ_HObjectPage", {
            key: "ReqId=" + sReqId + ",EnvId='" + sEnvId + "',IsActiveEntity=true",
          });
        }
      },

      // ── Data loading ─────────────────────────────────────────────────
      _loadData: function () {
        var oModel = this.getView().getModel("dash");
        oModel.setProperty("/loading", true);

        var sClient = _getSapClient();
        var sUrl = "/sap/opu/odata4/sap/zui_conf_req/srvd/sap/zsd_conf_req/0001/" +
          "ZC_CONF_REQ_H?$select=ReqId,ReqTitle,ModuleId,EnvId,Status,CreatedAt,ConfId" +
          "&$orderby=CreatedAt desc" +
          "&sap-client=" + sClient;

        fetch(sUrl, {
          credentials: "include",
          headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var aAll = (data.value || []).map(_mapRow);
            var kpi = {
              total:     aAll.length,
              submitted: aAll.filter(function (r) { return r.Status === "SUBMITTED"; }).length,
              approved:  aAll.filter(function (r) { return r.Status === "APPROVED"; }).length,
              rejected:  aAll.filter(function (r) { return r.Status === "REJECTED"; }).length,
              draft:     aAll.filter(function (r) { return r.Status === "DRAFT"; }).length,
            };
            oModel.setProperty("/allRequests", aAll);
            oModel.setProperty("/requests", aAll);
            oModel.setProperty("/kpi", kpi);
            oModel.setProperty("/loading", false);
          }.bind(this))
          .catch(function () {
            oModel.setProperty("/loading", false);
            MessageToast.show("Failed to load requests");
          });
      },

      onTilePress: function (sStatus) {
        if (typeof sStatus !== "string") { sStatus = "ALL"; }
        this._applyFilter(sStatus);
        var oSeg = this.byId("statusFilter");
        if (oSeg) { oSeg.setSelectedKey(sStatus); }
      },

      onStatusFilterChange: function (oEvent) {
        var sKey = oEvent.getParameter("item").getKey();
        this._applyFilter(sKey);
      },

      _applyFilter: function (sStatus) {
        var oModel = this.getView().getModel("dash");
        var aAll = oModel.getProperty("/allRequests");
        var aFiltered = sStatus === "ALL"
          ? aAll
          : aAll.filter(function (r) { return r.Status === sStatus; });
        oModel.setProperty("/requests", aFiltered);
        oModel.setProperty("/activeFilter", sStatus);
      },

      onRefresh: function () {
        this._loadData();
      },

      onRowPress: function (oEvent) {
        var oCtx = oEvent.getSource().getBindingContext("dash");
        if (!oCtx) {
          oCtx = oEvent.getSource().getParent().getBindingContext("dash");
        }
        if (!oCtx) return;
        var sReqId = oCtx.getProperty("ReqId");
        var sEnvId = oCtx.getProperty("EnvId") || "DEV";
        if (!sReqId) return;
        window.location.hash = "ZC_CONF_REQ_H(ReqId=" + sReqId + ",EnvId='" + sEnvId + "',IsActiveEntity=true)";
      },

      onViewAll: function () {
        this.getOwnerComponent().getRouter().navTo("ZC_CONF_REQ_HList");
      },

    });
  }
);
