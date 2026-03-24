sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/m/MessageToast"],
  function (Controller, JSONModel, MessageToast) {
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
        ReqId:       oItem.ReqId,
        ReqTitle:    oItem.ReqTitle || oItem.Title || "–",
        ModuleId:    oItem.ModuleId || "–",
        EnvId:       oItem.EnvId || "–",
        Status:      oItem.Status,
        StatusText:  st.text,
        StatusState: st.state,
        StatusIcon:  st.icon,
        CreatedAtText: _formatDate(oItem.CreatedAt),
        _raw:        oItem,
      };
    }

    return Controller.extend("zgsp26.conf.request.confrequestapp.ext.dashboard.Dashboard", {

      onInit: function () {
        var oModel = new JSONModel({
          loading: true,
          kpi: { total: 0, submitted: 0, approved: 0, rejected: 0, draft: 0 },
          requests: [],
          allRequests: [],
          activeFilter: "ALL",
        });
        this.getView().setModel(oModel, "dash");
        this._loadData();
      },

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
        // sStatus comes as a string literal from the press binding
        if (typeof sStatus !== "string") {
          sStatus = "ALL";
        }
        this._applyFilter(sStatus);
        // sync segmented button
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
          // fallback: get from parent ColumnListItem
          oCtx = oEvent.getSource().getParent().getBindingContext("dash");
        }
        if (!oCtx) return;
        var sReqId = oCtx.getProperty("ReqId");
        if (!sReqId) return;

        var sHash = "#app-preview&/ZC_CONF_REQ_H(" + sReqId + ",IsActiveEntity=true)";
        window.location.hash = sHash;
      },

      onViewAll: function () {
        this.getOwnerComponent().getRouter().navTo("ZC_CONF_REQ_HList");
      },

    });
  }
);
