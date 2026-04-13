sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/ui/core/Icon",
    "sap/m/MessageStrip",
    "sap/ui/core/routing/HashChanger",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/ScrollContainer",
    "sap/m/ObjectStatus",
    "sap/m/Label",
  ],
  function (Controller, JSONModel, MessageBox, MessageToast, VBox, HBox, Text, Icon, MessageStrip, HashChanger, Dialog, Button, ScrollContainer, ObjectStatus, Label) {
    "use strict";

    // ── Status stepper CSS ────────────────────────────────────────────────────
    var CSS = [
      ".csMngStepper{display:flex;align-items:flex-start;width:100%;padding:12px 0}",
      ".csMngStep{display:flex;flex-direction:column;align-items:center;min-width:80px}",
      ".csMngLine{flex:1;height:0;border-top:2px solid #c0c4c9;margin-top:18px;min-width:24px;align-self:flex-start}",
      ".csMngLine.done{border-color:#107e3e}",
      ".csMngCircle{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center}",
      ".csMngCircle.done{background:#107e3e}",
      ".csMngCircle.current{background:#0070f2}",
      ".csMngCircle.rejected{background:#bb0000}",
      ".csMngCircle.future{background:#89919a}",
      ".csMngLabel{font-size:.8rem;font-weight:600;margin-top:6px;color:#32363a;text-align:center}",
      ".csMngLabel.current{color:#0070f2}",
      ".csMngLabel.done{color:#107e3e}",
      ".csMngLabel.rejected{color:#bb0000}",
      ".csMngSub{font-size:.7rem;color:#6a6d70;text-align:center;white-space:pre-line;margin-top:2px}",
    ].join("");

    var _aStatusOrder = ["DRAFT", "SUBMITTED", "APPROVED", "PROMOTED"];
    var _mLabel = {
      DRAFT:       "Draft",
      SUBMITTED:   "Pending Approval",
      APPROVED:    "Approved",
      PROMOTED:    "Promoted",
      REJECTED:    "Rejected",
      ROLLED_BACK: "Rolled Back",
      ACTIVE:      "Active",
      DEPLOYED:    "Deployed",
    };

    var APP_PATH_MAP = {
      ZI_MM_ROUTE_CONF: { local: "http://localhost:8082/index.html", deploy: "/sap/bc/ui5_ui5/sap/zconfmmroute/index.html" },
      ZI_SD_PRICE_CONF: { local: "http://localhost:8083/index.html", deploy: "/sap/bc/ui5_ui5/sap/zconfsdprice/index.html" },
      ZI_FI_LIMIT_CONF: { local: "http://localhost:8084/index.html", deploy: "/sap/bc/ui5_ui5/sap/zconffillimit/index.html" },
      ZI_MM_SAFE_STOCK: { local: "http://localhost:8085/index.html", deploy: "/sap/bc/ui5_ui5/sap/zui_mm_safestk/index.html" },
    };

    var SERVICE_BASE = "/sap/opu/odata4/sap/zui_conf_req/srvd/sap/zsd_conf_req/0001/";

    var _CHANGELOG_SERVICES = {
      MM: {
        reqUrl: "/sap/opu/odata4/sap/zui_mm_route_conf/srvd/sap/zsd_mm_route_conf/0001/MMRouteConf",
        keyFields:  ["PlantId", "SendWh", "ReceiveWh"],
        oldKeyMap:  { PlantId: "OldPlantId", SendWh: "OldSendWh", ReceiveWh: "OldReceiveWh" },
        diffFields: [
          { field: "TransMode",   old: "OldTransMode"   },
          { field: "IsAllowed",   old: "OldIsAllowed"   },
          { field: "InspectorId", old: "OldInspectorId" },
        ],
      },
      MMSS: {
        reqUrl: "/sap/opu/odata4/sap/zui_mm_safe_stock/srvd/sap/zsd_mm_safe_stock/0001/MMSafeStock",
        keyFields:  ["PlantId", "MatGroup"],
        oldKeyMap:  { PlantId: "OldPlantId", MatGroup: "OldMatGroup" },
        diffFields: [
          { field: "MinQty", old: "OldMinQty" },
        ],
      },
      FI: {
        reqUrl: "/sap/opu/odata4/sap/zui_fi_limit_conf/srvd/sap/zsd_fi_limit_conf/0001/FILimitConf",
        keyFields:  ["ExpenseType", "GlAccount"],
        oldKeyMap:  { ExpenseType: "OldExpenseType", GlAccount: "OldGlAccount" },
        diffFields: [
          { field: "AutoApprLim", old: "OldAutoApprLim" },
          { field: "Currency",    old: "OldCurrency"    },
        ],
      },
      SD: {
        reqUrl: "/sap/opu/odata4/sap/zsd_sd_price_conf/srvd/sap/zsd_sd_price_conf/0001/SDPriceConf",
        keyFields:  ["BranchId", "CustGroup", "MaterialGrp"],
        oldKeyMap:  { BranchId: "OldBranchId", CustGroup: "OldCustGroup", MaterialGrp: "OldMaterialGrp" },
        diffFields: [
          { field: "MaxDiscount", old: "OldMaxDiscount" },
          { field: "MinOrderVal", old: "OldMinOrderVal" },
          { field: "ApproverGrp", old: "OldApproverGrp" },
          { field: "Currency",    old: "OldCurrency"    },
          { field: "ValidFrom",   old: "OldValidFrom"   },
          { field: "ValidTo",     old: "OldValidTo"     },
        ],
      },
    };

    function _getSapClient() {
      return new URLSearchParams(window.location.search).get("sap-client") || "324";
    }

    function _fetchUserRole() {
      var sUrl = SERVICE_BASE + "ZI_CURRENT_USER_ROLE?$filter=IsCurrentUser eq 'X'&$select=UserId,RoleLevel,IsActive&sap-client=" + _getSapClient();
      return fetch(sUrl, { credentials: "include", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var aRows = data.value || [];
          var oActive = aRows.find(function (r) { return r.IsActive === true || r.IsActive === "X"; }) || aRows[0];
          return oActive ? (oActive.RoleLevel || "").trim() : "";
        })
        .catch(function () { return ""; });
    }

    function _getNavMode() {
      return localStorage.getItem("conf-mng-nav-mode") ||
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "local" : "deploy");
    }

    function _getConfigAppUrl(sTargetCds) {
      var oEntry = APP_PATH_MAP[sTargetCds] || APP_PATH_MAP["ZI_MM_ROUTE_CONF"];
      var sPath  = oEntry[_getNavMode()] || oEntry.deploy;
      return _getNavMode() === "deploy" ? window.location.origin + sPath : sPath;
    }

    function _fmt(vDate) {
      if (!vDate) { return "–"; }
      try {
        var d = vDate instanceof Date ? vDate : new Date(vDate);
        if (isNaN(d.getTime())) { return "–"; }
        return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
      } catch (e) { return "–"; }
    }

    function _injectCSS() {
      if (!document.getElementById("csMngStepCSS")) {
        var el = document.createElement("style");
        el.id = "csMngStepCSS";
        el.textContent = CSS;
        document.head.appendChild(el);
      }
    }

    function _statusToState(sStatus) {
      var m = {
        DRAFT:       "None",
        SUBMITTED:   "Warning",
        APPROVED:    "Success",
        PROMOTED:    "Success",
        REJECTED:    "Error",
        ROLLED_BACK: "Warning",
        ACTIVE:      "Success",
        DEPLOYED:    "Success",
      };
      return m[sStatus] || "None";
    }

    function _statusToIcon(sStatus) {
      var m = {
        DRAFT:       "sap-icon://edit",
        SUBMITTED:   "sap-icon://pending",
        APPROVED:    "sap-icon://accept",
        PROMOTED:    "sap-icon://sys-enter-2",
        REJECTED:    "sap-icon://error",
        ROLLED_BACK: "sap-icon://undo",
        ACTIVE:      "sap-icon://sys-enter-2",
        DEPLOYED:    "sap-icon://upload",
      };
      return m[sStatus] || "sap-icon://status-inactive";
    }

    return Controller.extend("zgsp26.conf.request.confrequestapp.ext.requestObject.RequestObject", {

      onInit: function () {
        var oModel = new JSONModel({
          loading: true,
          ReqId: "", EnvId: "", ConfId: "", ModuleId: "", ReqTitle: "Loading...",
          Description: "", Status: "", StatusText: "–", StatusCriticality: "None", StatusIcon: "",
          Reason: "", RejectReason: "", ConfName: "", TargetCds: "",
          CreatedBy: "–", CreatedAt: "–", ApprovedBy: "–", ApprovedAt: "–",
          RejectedBy: "–", RejectedAt: "–", ChangedBy: "–", ChangedAt: "–",
          canEdit: false, canDelete: false, canApprove: false, canReject: false, canRollback: false,
          canOpenConfig: false, hasReqId: false,
        });
        this.getView().setModel(oModel, "req");

        this._fnHashChange = this._loadFromHash.bind(this);
        window.addEventListener("hashchange", this._fnHashChange);

        var that = this;
        setTimeout(function () { that._loadFromHash(); }, 0);
      },

      onExit: function () {
        if (this._fnHashChange) { window.removeEventListener("hashchange", this._fnHashChange); }
      },

      // ── Routing ──────────────────────────────────────────────────────────────

      _loadFromHash: function () {
        var sHash  = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
        // Pattern: ZC_CONF_REQ_H(ReqId=...,EnvId=...)
        var oMatch = sHash.match(/ZC_CONF_REQ_H\(([^)]+)\)/);
        if (!oMatch) { return; }
        var sKey = oMatch[1];
        if (sKey === this._sLastKey) { return; }
        this._sLastKey = sKey;
        this._loadRequest(sKey);
      },

      _parseKey: function (sKey) {
        // sKey = "ReqId='xxx',EnvId='yyy'" or "ReqId=xxx,EnvId=yyy"
        var oResult = {};
        sKey.split(",").forEach(function (sPair) {
          var aParts = sPair.split("=");
          if (aParts.length === 2) {
            oResult[aParts[0].trim()] = aParts[1].trim().replace(/^'|'$/g, "");
          }
        });
        return oResult;
      },

      // ── Data Loading ──────────────────────────────────────────────────────────

      _loadRequest: function (sKey) {
        var oModel  = this.getView().getModel("req");
        var sClient = _getSapClient();
        oModel.setProperty("/loading", true);

        var sUrl =
          SERVICE_BASE +
          "ZC_CONF_REQ_H(" + sKey + ")" +
          "?$select=ReqId,EnvId,ConfId,ModuleId,ReqTitle,Description,Status,Reason,RejectReason," +
          "ConfName,TargetCds,CreatedBy,CreatedAt,ApprovedBy,ApprovedAt,RejectedBy,RejectedAt,ChangedBy,ChangedAt" +
          "&sap-client=" + sClient;

        var that = this;
        Promise.all([
          fetch(sUrl, { credentials: "include", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } }).then(function (r) { return r.json(); }),
          _fetchUserRole(),
        ]).then(function (aResults) {
            var d     = aResults[0];
            var sRole = aResults[1]; // "MANAGER", "IT ADMIN", or ""
            var sStatus = d.Status || "DRAFT";

            // Button visibility rules:
            // Edit/Delete: owner (KEY USER) + DRAFT
            // Approve/Reject: MANAGER + SUBMITTED
            // Rollback: IT ADMIN + APPROVED or PROMOTED
            var bIsManager = sRole === "MANAGER";
            var bIsAdmin   = sRole === "IT ADMIN";
            var bIsKeyUser = !bIsManager && !bIsAdmin; // default role

            oModel.setData(Object.assign(oModel.getData(), {
              loading: false,
              ReqId: d.ReqId || "", EnvId: d.EnvId || "", ConfId: d.ConfId || "",
              ModuleId: d.ModuleId || "", ReqTitle: d.ReqTitle || "–",
              Description: d.Description || "–", Status: sStatus,
              StatusText: _mLabel[sStatus] || sStatus,
              StatusCriticality: _statusToState(sStatus),
              StatusIcon: _statusToIcon(sStatus),
              Reason: d.Reason || "–", RejectReason: d.RejectReason || "",
              ConfName: d.ConfName || "–", TargetCds: d.TargetCds || "",
              CreatedBy: d.CreatedBy || "–", CreatedAt: _fmt(d.CreatedAt),
              ApprovedBy: d.ApprovedBy || "–", ApprovedAt: _fmt(d.ApprovedAt),
              RejectedBy: d.RejectedBy || "–", RejectedAt: _fmt(d.RejectedAt),
              ChangedBy: d.ChangedBy || "–", ChangedAt: _fmt(d.ChangedAt),
              canEdit:        (bIsKeyUser || bIsAdmin) && sStatus === "DRAFT",
              canDelete:      (bIsKeyUser || bIsAdmin) && sStatus === "DRAFT",
              canApprove:     bIsManager && sStatus === "SUBMITTED",
              canReject:      bIsManager && sStatus === "SUBMITTED",
              canRollback:    bIsAdmin && (sStatus === "APPROVED" || sStatus === "PROMOTED"),
              canOpenConfig:  sStatus === "DRAFT",
              hasReqId:       !!d.ReqId,
            }));
            that._buildStepper(d);
          })
          .catch(function (e) {
            oModel.setProperty("/loading", false);
            MessageToast.show("Failed to load request: " + e.message);
          });
      },

      // ── Config Changelog ──────────────────────────────────────────────────────

      onShowChangelog: function () {
        var oData = this.getView().getModel("req").getData();
        if (!oData.ReqId) { return; }

        var that    = this;
        var oView   = this.getView();
        var oDialog = new Dialog({
          title: "Config Changelog",
          contentWidth: "640px",
          contentHeight: "480px",
          endButton: new Button({
            text: "Close",
            press: function () { oDialog.close(); oDialog.destroy(); },
          }),
          content: [new Text({ text: "Loading…" }).addStyleClass("sapUiSmallMargin")],
        });
        oView.addDependent(oDialog);
        oDialog.open();

        that._fetchConfigLines(oData.ReqId, oData.ModuleId)
          .then(function (aRows) {
            oDialog.destroyContent();
            if (!aRows.length) {
              oDialog.addContent(new Text({ text: "No configuration changes found." }).addStyleClass("sapUiSmallMargin"));
              return;
            }
            var oContent = that._buildChangelogContent(aRows);
            oDialog.addContent(new ScrollContainer({ height: "100%", vertical: true, content: [oContent] }));
          })
          .catch(function (e) {
            oDialog.destroyContent();
            oDialog.addContent(new Text({ text: "Failed to load changelog: " + e.message }).addStyleClass("sapUiSmallMargin"));
          });
      },

      _fetchConfigLines: function (sReqId, sModuleId) {
        var that  = this;
        var aKeys = sModuleId ? [sModuleId] : Object.keys(_CHANGELOG_SERVICES);
        var aFetches = aKeys.map(function (sKey) {
          var oSvc = _CHANGELOG_SERVICES[sKey];
          if (!oSvc) { return Promise.resolve(null); }
          var sUrl = oSvc.reqUrl + "?$filter=" + encodeURIComponent("ReqId eq " + sReqId);
          return fetch(sUrl, {
            credentials: "include",
            headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
          }).then(function (r) {
            if (!r.ok) { return null; }
            return r.json().then(function (d) {
              var aItems = d.value || [];
              if (!aItems.length) { return null; }
              return { svc: oSvc, items: aItems };
            });
          }).catch(function () { return null; });
        });

        return Promise.all(aFetches).then(function (aResults) {
          var oFound = aResults.find(function (r) { return r !== null; });
          if (!oFound) { return []; }
          return that._normalizeLines(oFound.items, oFound.svc);
        });
      },

      _normalizeLines: function (aItems, oSvc) {
        var aRows = [];
        aItems.forEach(function (oItem) {
          var sKeyInfo = oSvc.keyFields
            .map(function (f) { return oItem[f] || "–"; })
            .join(" / ");

          var sActionType = (oItem.ActionType || "").toUpperCase();
          var sRowType = "UNCHANGED";
          if      (sActionType === "C") { sRowType = "ADDED"; }
          else if (sActionType === "X") { sRowType = "DELETED"; }
          else if (sActionType === "U") { sRowType = "MODIFIED"; }

          var aFields = oSvc.diffFields.map(function (d) {
            var sOld = oItem[d.old]   != null ? String(oItem[d.old])   : "";
            var sNew = oItem[d.field] != null ? String(oItem[d.field]) : "";
            return { field: d.field, oldVal: sOld, newVal: sNew, changed: sOld !== sNew };
          });

          if (!sActionType) {
            var bAnyChanged  = aFields.some(function (f) { return f.changed; });
            var bAllOldEmpty = aFields.every(function (f) { return !f.oldVal || f.oldVal === "false" || f.oldVal === "0"; });
            var bAllNewEmpty = aFields.every(function (f) { return !f.newVal || f.newVal === "false" || f.newVal === "0"; });
            if (bAnyChanged) {
              if (bAllOldEmpty)      { sRowType = "ADDED"; }
              else if (bAllNewEmpty) { sRowType = "DELETED"; }
              else                   { sRowType = "MODIFIED"; }
            }
          }

          aRows.push({ keyInfo: sKeyInfo, rowType: sRowType, fields: aFields });
        });
        return aRows;
      },

      _buildChangelogContent: function (aRows) {
        var mBadge = {
          ADDED:     { text: "CREATE",   state: "Success" },
          MODIFIED:  { text: "UPDATE",   state: "Warning" },
          DELETED:   { text: "DELETE",   state: "Error"   },
          UNCHANGED: { text: "UNCHANGED",state: "None"    },
        };

        var oOuterVBox = new VBox().addStyleClass("sapUiSmallMargin");

        aRows.forEach(function (oRow, iIdx) {
          var oBadgeCfg = mBadge[oRow.rowType] || mBadge.UNCHANGED;

          // Row header: badge + key info
          var oHeader = new HBox({
            alignItems: "Center",
            items: [
              new ObjectStatus({ text: oBadgeCfg.text, state: oBadgeCfg.state, inverted: true }),
              new Text({ text: oRow.keyInfo }).addStyleClass("sapUiSmallMarginBegin"),
            ],
          }).addStyleClass("sapUiTinyMarginBottom");

          // Field changes
          var aFieldItems = [oHeader];
          oRow.fields.forEach(function (oField) {
            var sOld = oField.oldVal || "–";
            var sNew = oField.newVal || "–";
            var sDisplay = oField.changed
              ? oField.field + ":  " + sOld + "  →  " + sNew
              : oField.field + ":  " + sNew;

            var oFieldText = new Text({ text: sDisplay, wrapping: false });
            if (oField.changed) { oFieldText.addStyleClass("sapThemeHighlight-asColor"); }
            aFieldItems.push(
              new HBox({ items: [new Label({ text: " " }), oFieldText] })
                .addStyleClass("sapUiTinyMarginBegin")
            );
          });

          var oRowVBox = new VBox({ items: aFieldItems })
            .addStyleClass("sapUiSmallMarginBottom");

          // Separator between rows
          if (iIdx > 0) {
            oOuterVBox.addItem(
              new HBox({}).addStyleClass("sapUiSmallMarginBottom")
            );
          }
          oOuterVBox.addItem(oRowVBox);
        });

        return oOuterVBox;
      },

      // ── Stepper ───────────────────────────────────────────────────────────────

      _buildStepper: function (d) {
        _injectCSS();
        var oView      = this.getView();
        var oContainer = oView.byId("stepperContainer");
        if (!oContainer) { return; }
        oContainer.destroyItems();

        var sStatus   = d.Status || "DRAFT";
        var bRejected = sStatus === "REJECTED";
        var aSteps    = bRejected ? ["DRAFT", "SUBMITTED", "REJECTED"] : ["DRAFT", "SUBMITTED", "APPROVED", "PROMOTED"];
        var iCurrent  = bRejected ? 2 : _aStatusOrder.indexOf(sStatus);
        var bAllDone  = sStatus === "PROMOTED";

        var mSub = {
          DRAFT:     (d.CreatedBy  ? "by " + d.CreatedBy  : "") + (_fmt(d.CreatedAt)  !== "–" ? "\n" + _fmt(d.CreatedAt)  : ""),
          SUBMITTED: "",
          APPROVED:  (d.ApprovedBy ? "by " + d.ApprovedBy : "") + (_fmt(d.ApprovedAt) !== "–" ? "\n" + _fmt(d.ApprovedAt) : ""),
          REJECTED:  (d.RejectedBy ? "by " + d.RejectedBy : "") + (_fmt(d.RejectedAt) !== "–" ? "\n" + _fmt(d.RejectedAt) : ""),
          PROMOTED:  "",
        };

        var mIcon = { done: "sap-icon://accept", current: "sap-icon://sys-enter-2", rejected: "sap-icon://error", future: "sap-icon://circle-task-2" };

        var aHBoxItems = [];
        aSteps.forEach(function (sStep, i) {
          var sState;
          if (bRejected)         { sState = (i === 2) ? "rejected" : "done"; }
          else if (bAllDone)     { sState = "done"; }
          else if (i < iCurrent) { sState = "done"; }
          else if (i === iCurrent) { sState = "current"; }
          else                   { sState = "future"; }

          var oCircleBox = new VBox({ alignItems: "Center", justifyContent: "Center",
            items: [new Icon({ src: mIcon[sState], color: "#ffffff", size: "1rem" })]
          }).addStyleClass("csMngCircle " + sState);

          var oStepVBox = new VBox({ alignItems: "Center",
            items: [oCircleBox, new Text({ text: _mLabel[sStep] || sStep, wrapping: false }).addStyleClass("csMngLabel " + (sState === "future" ? "" : sState))]
          }).addStyleClass("csMngStep");

          var sSub = (mSub[sStep] || "").trim();
          if (sSub) { oStepVBox.addItem(new Text({ text: sSub, wrapping: true }).addStyleClass("csMngSub")); }

          aHBoxItems.push(oStepVBox);
          if (i < aSteps.length - 1) {
            aHBoxItems.push(new VBox({}).addStyleClass("csMngLine" + (sState === "done" ? " done" : "")));
          }
        });

        var aBlockItems = [];

        // Alert strip
        if (bRejected) {
          aBlockItems.push(new MessageStrip({
            text: "Rejected" + (d.RejectedBy ? " by " + d.RejectedBy : "") + (d.RejectReason ? ': "' + d.RejectReason + '"' : "."),
            type: "Error", showIcon: true,
          }).addStyleClass("sapUiSmallMarginBottom"));
        } else if (sStatus === "APPROVED" && d.ApprovedBy) {
          aBlockItems.push(new MessageStrip({ text: "Approved by " + d.ApprovedBy + ". Ready to be promoted.", type: "Success", showIcon: true }).addStyleClass("sapUiSmallMarginBottom"));
        } else if (sStatus === "PROMOTED") {
          aBlockItems.push(new MessageStrip({ text: "Configuration has been successfully promoted to all target environments.", type: "Success", showIcon: true }).addStyleClass("sapUiSmallMarginBottom"));
        }

        aBlockItems.push(new HBox({ items: aHBoxItems }).addStyleClass("csMngStepper"));
        aBlockItems.forEach(function (oItem) { oContainer.addItem(oItem); });
      },

      // ── Navigation ────────────────────────────────────────────────────────────

      onNavBack: function () {
        var oHistory = sap.ui.core.routing.History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();
        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          HashChanger.getInstance().setHash("list");
        }
      },

      // ── Actions ───────────────────────────────────────────────────────────────

      _getKey: function () {
        var oData = this.getView().getModel("req").getData();
        return "ReqId=" + oData.ReqId + ",EnvId='" + oData.EnvId + "'";
      },

      _fetchCsrf: function () {
        return fetch(
          SERVICE_BASE + "?sap-client=" + _getSapClient(),
          { method: "GET", headers: { "X-CSRF-Token": "Fetch", "X-Requested-With": "XMLHttpRequest" }, credentials: "include" }
        ).then(function (r) {
          var t = r.headers.get("X-CSRF-Token");
          if (!t) { throw new Error("Cannot fetch CSRF token"); }
          return t;
        });
      },

      _callAction: function (sAction, oBody) {
        var that    = this;
        var sKey    = this._getKey();
        var sClient = _getSapClient();
        return this._fetchCsrf().then(function (sCsrf) {
          return fetch(
            SERVICE_BASE +
            "ZC_CONF_REQ_H(" + sKey + ")/com.sap.gateway.srvd.zsd_conf_req.v0001." + sAction +
            "?sap-client=" + sClient,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-CSRF-Token": sCsrf, "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
              credentials: "include",
              body: JSON.stringify(oBody || {}),
            }
          );
        }).then(function (r) {
          if (!r.ok) { return r.json().then(function (e) { throw new Error(e?.error?.message || "Action failed: " + r.status); }); }
          // Reload after action
          that._sLastKey = null;
          that._loadFromHash();
        });
      },

      onEdit: function () {
        this._callAction("Edit", {}).catch(function (e) { MessageBox.error(e.message); });
      },

      onDelete: function () {
        var that = this;
        MessageBox.confirm("Delete this request?", {
          onClose: function (sAction) {
            if (sAction !== "OK") { return; }
            var sKey = that._getKey();
            that._fetchCsrf().then(function (sCsrf) {
              return fetch(
                SERVICE_BASE + "ZC_CONF_REQ_H(" + sKey + ")?sap-client=" + _getSapClient(),
                { method: "DELETE", headers: { "X-CSRF-Token": sCsrf, "X-Requested-With": "XMLHttpRequest" }, credentials: "include" }
              );
            }).then(function () {
              HashChanger.getInstance().setHash("list");
            }).catch(function (e) { MessageBox.error(e.message); });
          },
        });
      },

      onApprove: function () {
        this._callAction("approve", {}).catch(function (e) { MessageBox.error(e.message); });
      },

      onReject: function () {
        var that = this;
        MessageBox.prompt("Reason for rejection:", {
          title: "Reject Request",
          onClose: function (sAction, sValue) {
            if (sAction !== "OK") { return; }
            that._callAction("reject", { RejectReason: sValue || "" }).catch(function (e) { MessageBox.error(e.message); });
          },
        });
      },

      onRollback: function () {
        this._callAction("rollback", {}).catch(function (e) { MessageBox.error(e.message); });
      },

      onOpenConfig: function () {
        var oData = this.getView().getModel("req").getData();
        if (!oData.ReqId) { return; }
        if (!oData.TargetCds) { MessageBox.error("TargetCds is missing"); return; }

        var sUrl = _getConfigAppUrl(oData.TargetCds) +
          "?sap-client=" + _getSapClient() +
          "&ReqId="     + encodeURIComponent(oData.ReqId) +
          "&ConfId="    + encodeURIComponent(oData.ConfId) +
          "&ConfName="  + encodeURIComponent(oData.ConfName) +
          "&ModuleId="  + encodeURIComponent(oData.ModuleId) +
          "&TargetCds=" + encodeURIComponent(oData.TargetCds) +
          "&EnvId="     + encodeURIComponent(oData.EnvId) +
          "&Status="    + encodeURIComponent(oData.Status);

        var oLink = document.createElement("a");
        oLink.href = sUrl; oLink.target = "_self"; oLink.rel = "noopener noreferrer";
        document.body.appendChild(oLink);
        oLink.click();
        document.body.removeChild(oLink);
      },

    });
  }
);
