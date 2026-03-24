sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/ui/core/Component", "sap/m/MessageToast"],
  function (Controller, JSONModel, Component, MessageToast) {
    "use strict";

    var STATUS_MAP = {
      DRAFT:       { text: "Draft",            state: "None",    icon: "sap-icon://edit"        },
      SUBMITTED:   { text: "Pending Approval", state: "Warning", icon: "sap-icon://pending"     },
      APPROVED:    { text: "Approved",         state: "Success", icon: "sap-icon://accept"      },
      REJECTED:    { text: "Rejected",         state: "Error",   icon: "sap-icon://decline"     },
      ROLLED_BACK: { text: "Rolled Back",      state: "Warning", icon: "sap-icon://undo"        },
      ACTIVE:      { text: "Active",           state: "Success", icon: "sap-icon://sys-enter-2" },
      DEPLOYED:    { text: "Deployed",         state: "Success", icon: "sap-icon://upload"      },
    };

    var PORT_MAP = {
      ZI_MM_ROUTE_CONF: "8083",
      ZI_MM_SAFE_STOCK: "8084",
      ZI_SD_PRICE_CONF: "8085",
      ZI_FI_LIMIT_CONF: "8086",
    };

    function _getSapClient() {
      return new URLSearchParams(window.location.search).get("sap-client") || "324";
    }

    function _formatDate(sVal) {
      if (!sVal) return "–";
      try {
        return new Date(sVal).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } catch (e) { return sVal; }
    }

    function _mapRow(oItem) {
      var st = STATUS_MAP[oItem.Status] || { text: oItem.Status, state: "None", icon: "" };
      return {
        ReqId:       oItem.ReqId,
        ReqTitle:    oItem.ReqTitle || oItem.Title || "–",
        ModuleId:    oItem.ModuleId || "–",
        EnvId:       oItem.EnvId || "–",
        CreatedBy:   oItem.CreatedBy || "–",
        Status:      oItem.Status,
        StatusText:  st.text,
        StatusState: st.state,
        StatusIcon:  st.icon,
        CreatedAtText: _formatDate(oItem.CreatedAt),
      };
    }

    return Controller.extend("zgsp26.conf.request.confrequestapp.ext.catalogLanding.CatalogLanding", {

      onInit: function () {
        var oModel = new JSONModel({
          loading: true,
          ConfId:   "",
          ConfName: "Configuration",
          ModuleId: "",
          EnvId:    "DEV",
          TargetCds: "",
          kpi: { total: 0, submitted: 0, approved: 0, rejected: 0, draft: 0 },
          requests: [],
          allRequests: [],
        });
        this.getView().setModel(oModel, "catalog");

        // Read catalog context from AppComponent
        var oCatalogCtx = this._getCatalogCtx();
        if (oCatalogCtx && oCatalogCtx.ConfId) {
          oModel.setProperty("/ConfId",    oCatalogCtx.ConfId);
          oModel.setProperty("/ConfName",  oCatalogCtx.ConfName  || "Configuration");
          oModel.setProperty("/ModuleId",  oCatalogCtx.ModuleId  || "");
          oModel.setProperty("/EnvId",     oCatalogCtx.EnvId     || "DEV");
          oModel.setProperty("/TargetCds", oCatalogCtx.TargetCds || "");
          this._loadRequests(oCatalogCtx.ConfId);
        } else {
          oModel.setProperty("/loading", false);
        }
      },

      _getCatalogCtx: function () {
        // Try AppComponent model first
        try {
          var oAppComp = this.getOwnerComponent().getAppComponent
            ? this.getOwnerComponent().getAppComponent()
            : Component.getOwnerComponentFor(this.getView());
          var oCtxModel = oAppComp && oAppComp.getModel("catalogCtx");
          if (oCtxModel) return oCtxModel.getData();
        } catch (e) { /* ignore */ }

        // Fallback: read from URL params
        var oParams = new URLSearchParams(window.location.search);
        return {
          ConfId:    oParams.get("ConfId")    || "",
          ConfName:  oParams.get("ConfName")  || "",
          ModuleId:  oParams.get("ModuleId")  || "",
          EnvId:     oParams.get("EnvId")     || "DEV",
          TargetCds: oParams.get("TargetCds") || "",
        };
      },

      _loadRequests: function (sConfId) {
        var oModel = this.getView().getModel("catalog");
        oModel.setProperty("/loading", true);

        var sClient = _getSapClient();
        var sUrl = "/sap/opu/odata4/sap/zui_conf_req/srvd/sap/zsd_conf_req/0001/" +
          "ZC_CONF_REQ_H?$select=ReqId,ReqTitle,ModuleId,EnvId,Status,CreatedAt,CreatedBy,ConfId" +
          "&$filter=ConfId eq " + sConfId +
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

      onStatusFilterChange: function (oEvent) {
        var sKey = oEvent.getParameter("item").getKey();
        var oModel = this.getView().getModel("catalog");
        var aAll = oModel.getProperty("/allRequests");
        var aFiltered = sKey === "ALL" ? aAll : aAll.filter(function (r) { return r.Status === sKey; });
        oModel.setProperty("/requests", aFiltered);
      },

      onRefresh: function () {
        var sConfId = this.getView().getModel("catalog").getProperty("/ConfId");
        if (sConfId) this._loadRequests(sConfId);
      },

      onRowPress: function (oEvent) {
        var oCtx = oEvent.getSource().getBindingContext("catalog");
        if (!oCtx) {
          oCtx = oEvent.getSource().getParent().getBindingContext("catalog");
        }
        if (!oCtx) return;
        var sReqId = oCtx.getProperty("ReqId");
        if (!sReqId) return;
        window.location.hash = "#app-preview&/ZC_CONF_REQ_H(" + sReqId + ",IsActiveEntity=true)";
      },

      onOpenConfig: function () {
        // Use the most recent request (first in list, sorted desc)
        var oModel = this.getView().getModel("catalog");
        var aRequests = oModel.getProperty("/allRequests") || [];
        var oFirst = aRequests[0] || {};
        this._navigateToConfig(oFirst.ReqId || "", oFirst.Status || "DRAFT");
      },

      onOpenConfigRow: function (oEvent) {
        var oCtx = oEvent.getSource().getBindingContext("catalog");
        if (!oCtx) return;
        var sReqId  = oCtx.getProperty("ReqId");
        var sStatus = oCtx.getProperty("Status");
        this._navigateToConfig(sReqId, sStatus);
      },

      _navigateToConfig: function (sReqId, sStatus) {
        var oModel = this.getView().getModel("catalog");
        var sTargetCds = oModel.getProperty("/TargetCds");
        var sPort = PORT_MAP[sTargetCds] || "8083";
        var sClient = _getSapClient();

        var sUrl = "http://localhost:" + sPort + "/test/flp.html" +
          "?sap-ui-xx-viewCache=false" +
          "&sap-client=" + sClient +
          "&ReqId="     + encodeURIComponent(sReqId) +
          "&ConfId="    + encodeURIComponent(oModel.getProperty("/ConfId")) +
          "&ConfName="  + encodeURIComponent(oModel.getProperty("/ConfName")) +
          "&ModuleId="  + encodeURIComponent(oModel.getProperty("/ModuleId")) +
          "&TargetCds=" + encodeURIComponent(sTargetCds) +
          "&EnvId="     + encodeURIComponent(oModel.getProperty("/EnvId")) +
          "&Status="    + encodeURIComponent(sStatus) +
          "#app-preview";

        window.open(sUrl, "_self");
      },

      onNavBack: function () {
        this.getOwnerComponent().getRouter().navTo("Dashboard");
      },

    });
  }
);
