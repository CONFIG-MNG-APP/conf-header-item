sap.ui.define(
  [
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Component",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/MessageStrip",
    "sap/ui/core/Icon",
    "sap/uxap/ObjectPageSection",
    "sap/uxap/ObjectPageSubSection",
  ],
  function (
    ControllerExtension,
    Component,
    VBox,
    HBox,
    Label,
    Text,
    MessageStrip,
    Icon,
    ObjectPageSection,
    ObjectPageSubSection,
  ) {
    "use strict";

    var _aStatusOrder = ["DRAFT", "SUBMITTED", "APPROVED", "PROMOTED"];

    return ControllerExtension.extend(
      "zgsp26.conf.request.confrequestapp.ext.controller.RequestObjectExt",
      {
        override: {
          onAfterRendering: function () {
            this._ensureCatalogContextSection();
            this._tryRenderStatusSection();
          },
        },

        // ─── Status Timeline ────────────────────────────────────────────────

        _tryRenderStatusSection: function () {
          var oView = this.base.getView();
          var oContext = oView.getBindingContext();
          if (oContext) {
            this._renderStatusSection(oContext);
          } else {
            oView.attachEventOnce("modelContextChange", function () {
              var oCtx = oView.getBindingContext();
              if (oCtx) { this._renderStatusSection(oCtx); }
            }.bind(this));
          }
        },

        _renderStatusSection: function (oContext) {
          var that = this;
          oContext.requestProperty(["Status", "Reason", "RejectedBy", "ApprovedBy"])
            .then(function (aVals) {
              that._buildStatusSection(
                aVals[0] || "DRAFT",
                aVals[1] || "",
                aVals[2] || "",
                aVals[3] || ""
              );
            })
            .catch(function (err) {
              console.warn("[StatusTimeline] Could not load fields:", err);
            });
        },

        _buildStatusSection: function (sStatus, sReason, sRejectedBy, sApprovedBy) {
          var oView   = this.base.getView();
          var oLayout = this._findObjectPageLayout();
          if (!oLayout) { return; }

          // Skip re-render when nothing changed
          var oExisting = oView.byId("statusTimelineSection");
          if (oExisting && oExisting.data("renderedStatus") === sStatus) { return; }
          if (oExisting) {
            oLayout.removeSection(oExisting);
            oExisting.destroy();
          }

          var bIsRejected = sStatus === "REJECTED";
          var aContentItems = [];

          // ── Rejection / Approval strip ────────────────────────────────────
          if (bIsRejected) {
            var sMsg = "This request was rejected"
              + (sRejectedBy ? " by " + sRejectedBy : "")
              + (sReason     ? ": \u201c" + sReason + "\u201d" : ".");
            aContentItems.push(
              new MessageStrip({
                text: sMsg,
                type: "Error",
                showIcon: true,
              }).addStyleClass("sapUiSmallMarginBottom")
            );
          } else if (sStatus === "APPROVED" && sApprovedBy) {
            aContentItems.push(
              new MessageStrip({
                text: "Approved by " + sApprovedBy + ". Ready to be promoted to production.",
                type: "Success",
                showIcon: true,
              }).addStyleClass("sapUiSmallMarginBottom")
            );
          }

          // ── Timeline HBox ─────────────────────────────────────────────────
          var aSteps = bIsRejected
            ? ["DRAFT", "SUBMITTED", "REJECTED"]
            : ["DRAFT", "SUBMITTED", "APPROVED", "PROMOTED"];

          var iCurrentIdx = bIsRejected
            ? -1
            : _aStatusOrder.indexOf(sStatus);

          var bAllDone = sStatus === "PROMOTED";

          var aTimelineItems = [];
          aSteps.forEach(function (sStep, i) {
            // Determine state
            var sState;
            if (bIsRejected) {
              sState = (sStep === "REJECTED") ? "rejected" : "done";
            } else if (bAllDone) {
              sState = "done";
            } else if (i < iCurrentIdx) {
              sState = "done";
            } else if (i === iCurrentIdx) {
              sState = "current";
            } else {
              sState = "future";
            }

            // Icon & color per state
            var sIcon, sColor;
            switch (sState) {
              case "done":     sIcon = "sap-icon://accept";           sColor = "#107e3e"; break;
              case "current":  sIcon = "sap-icon://status-in-process"; sColor = "#0070f2"; break;
              case "rejected": sIcon = "sap-icon://error";            sColor = "#bb0000"; break;
              default:         sIcon = "sap-icon://circle-task";      sColor = "#89919a";
            }

            var sLabel = sStep.charAt(0) + sStep.slice(1).toLowerCase();

            aTimelineItems.push(
              new VBox({
                alignItems: "Center",
                items: [
                  new Icon({ src: sIcon, color: sColor, size: "1.5rem" }),
                  new Text({ text: sLabel }).addStyleClass("sapUiTinyMarginTop"),
                ],
              }).addStyleClass("sapUiSmallMarginBeginEnd")
            );

            // Connector line between steps
            if (i < aSteps.length - 1) {
              aTimelineItems.push(
                new Text({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" })
                  .addStyleClass("sapUiSmallMarginTop")
              );
            }
          });

          aContentItems.push(
            new HBox({ alignItems: "Center", items: aTimelineItems })
              .addStyleClass("sapUiSmallMarginTop sapUiSmallMarginBottom")
          );

          // ── Assemble section ──────────────────────────────────────────────
          var oSection = new ObjectPageSection(
            oView.createId("statusTimelineSection"),
            {
              title: "Request Progress",
              subSections: [
                new ObjectPageSubSection({
                  blocks: [new VBox({ items: aContentItems })],
                }),
              ],
            }
          );
          oSection.data("renderedStatus", sStatus);
          oLayout.insertSection(oSection, 0);
        },

        // ─── Catalog Context Section (existing) ──────────────────────────────

        _getAppComponent: function () {
          var oView = this.base.getView();
          return this.base.getAppComponent
            ? this.base.getAppComponent()
            : Component.getOwnerComponentFor(oView);
        },

        _getCatalogContext: function () {
          var oAppComponent = this._getAppComponent();
          var oModel = oAppComponent ? oAppComponent.getModel("catalogCtx") : null;
          return oModel ? oModel.getData() : {};
        },

        _createFieldBlock: function (sLabel, sBindingPath) {
          return new VBox({
            width: "14rem",
            items: [
              new Label({ text: sLabel }),
              new Text({ text: sBindingPath }),
            ],
          }).addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginBottom");
        },

        _findObjectPageLayout: function () {
          var oView = this.base.getView();
          var aLayouts = oView.findAggregatedObjects(true, function (oControl) {
            return oControl.isA && oControl.isA("sap.uxap.ObjectPageLayout");
          });
          return aLayouts && aLayouts.length ? aLayouts[0] : null;
        },

        _ensureCatalogContextSection: function () {
          var oCatalogCtx = this._getCatalogContext();
          if (!oCatalogCtx || !oCatalogCtx.hasCatalogContext) { return; }

          var oView = this.base.getView();
          if (oView.byId("catalogContextSection")) { return; }

          var oLayout = this._findObjectPageLayout();
          if (!oLayout) { return; }

          var oContentBox = new VBox({
            items: [
              new HBox({
                wrap: "Wrap",
                items: [
                  this._createFieldBlock("Configuration", "{catalogCtx>/ConfName}"),
                  this._createFieldBlock("Module",        "{catalogCtx>/ModuleId}"),
                  this._createFieldBlock("Target CDS",    "{catalogCtx>/TargetCds}"),
                  this._createFieldBlock("Environment",   "{catalogCtx>/EnvId}"),
                ],
              }),
            ],
          }).addStyleClass("sapUiSmallMarginTop sapUiSmallMarginBottom");

          var oSubSection = new ObjectPageSubSection({ blocks: [oContentBox] });

          var oSection = new ObjectPageSection(
            oView.createId("catalogContextSection"),
            {
              title: "Configuration Context",
              subSections: [oSubSection],
            }
          );

          if (oLayout.insertSection) {
            oLayout.insertSection(oSection, 0);
          } else if (oLayout.addSection) {
            oLayout.addSection(oSection);
          }
        },

        // ─── Open Config Action (existing) ───────────────────────────────────

        onOpenConfig: function () {
          const oView    = this.base.getView();
          const oContext = oView.getBindingContext();

          if (!oContext) {
            sap.m.MessageBox.error("No request context found");
            return;
          }

          const oData     = oContext.getObject();
          const sReqId    = oData.ReqId    || "";
          const sConfId   = oData.ConfId   || "";
          const sConfName = oData.ConfName || "";
          const sModuleId = oData.ModuleId || "";
          const sTargetCds = oData.TargetCds || "";

          if (!sReqId) {
            sap.m.MessageBox.error("ReqId not found");
            return;
          }

          const sMode = localStorage.getItem("conf-mng-nav-mode") ||
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
              ? "local" : "deploy");
          const sAppBase = sMode === "local"
            ? "http://localhost:8082/index.html"
            : window.location.origin + "/sap/bc/ui5_ui5/sap/zconfmmroute/index.html";

          const sUrl = sAppBase
            + "?sap-client=" + (new URLSearchParams(window.location.search).get("sap-client") || "324")
            + "&ReqId="    + encodeURIComponent(sReqId)
            + "&ConfId="   + encodeURIComponent(sConfId)
            + "&ConfName=" + encodeURIComponent(sConfName)
            + "&ModuleId=" + encodeURIComponent(sModuleId)
            + "&TargetCds=" + encodeURIComponent(sTargetCds);

          console.log("Navigate to config app:", sUrl);
          window.open(sUrl, "_blank");
        },
      },
    );
  },
);
