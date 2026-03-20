sap.ui.define(
  [
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Component",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Label",
    "sap/m/Text",
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
    ObjectPageSection,
    ObjectPageSubSection,
  ) {
    "use strict";

    return ControllerExtension.extend(
      "zgsp26.conf.request.confrequestapp.ext.controller.RequestObjectExt",
      {
        override: {
          onAfterRendering: function () {
            this._ensureCatalogContextSection();
          },
        },

        _getAppComponent: function () {
          var oView = this.base.getView();

          return this.base.getAppComponent
            ? this.base.getAppComponent()
            : Component.getOwnerComponentFor(oView);
        },

        _getCatalogContext: function () {
          var oAppComponent = this._getAppComponent();
          var oModel = oAppComponent
            ? oAppComponent.getModel("catalogCtx")
            : null;
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
          if (!oCatalogCtx || !oCatalogCtx.hasCatalogContext) {
            return;
          }

          var oView = this.base.getView();
          if (oView.byId("catalogContextSection")) {
            return;
          }

          var oLayout = this._findObjectPageLayout();
          if (!oLayout) {
            return;
          }

          var oContentBox = new VBox({
            items: [
              new HBox({
                wrap: "Wrap",
                items: [
                  this._createFieldBlock(
                    "Configuration",
                    "{catalogCtx>/ConfName}",
                  ),
                  this._createFieldBlock("Module", "{catalogCtx>/ModuleId}"),
                  this._createFieldBlock(
                    "Target CDS",
                    "{catalogCtx>/TargetCds}",
                  ),
                  this._createFieldBlock("Environment", "{catalogCtx>/EnvId}"),
                ],
              }),
            ],
          }).addStyleClass("sapUiSmallMarginTop sapUiSmallMarginBottom");

          var oSubSection = new ObjectPageSubSection({
            blocks: [oContentBox],
          });

          var oSection = new ObjectPageSection(
            oView.createId("catalogContextSection"),
            {
              title: "Configuration Context",
              subSections: [oSubSection],
            },
          );

          if (oLayout.insertSection) {
            oLayout.insertSection(oSection, 0);
          } else if (oLayout.addSection) {
            oLayout.addSection(oSection);
          }
        },
        _getUrlParams: function () {
          const oParams = new URLSearchParams(window.location.search);
          return {
            ConfId: oParams.get("ConfId") || "",
            ConfName: oParams.get("ConfName") || "",
            ModuleId: oParams.get("ModuleId") || "",
            TargetCds: oParams.get("TargetCds") || "",
          };
        },

        onOpenConfig: async function () {
          console.log("onOpenConfig called");
          try {
            const oView = this.base.getView();
            const oContext = oView.getBindingContext();

            if (!oContext) {
              console.error("onOpenConfig: no binding context");
              return;
            }

            const oData = oContext.getObject();
            console.log("onOpenConfig oData:", JSON.stringify(oData));

            const sReqId = oData.ReqId || "";
            if (!sReqId) {
              console.error("onOpenConfig: ReqId missing", oData);
              return;
            }

            // Đọc từ binding context trước, fallback sang URL params
            const oUrlParams = this._getUrlParams();
            const sConfId    = oData.ConfId    || oUrlParams.ConfId    || "";
            const sConfName  = oData.ReqTitle  || oUrlParams.ConfName  || "";
            const sModuleId  = oData.ModuleId  || oUrlParams.ModuleId  || "";
            const sStatus    = oData.Status    || "D";

            // Đọc TargetCds từ item đầu tiên qua OData
            let sTargetCds = oUrlParams.TargetCds || "";
            if (!sTargetCds) {
              try {
                const sSapClient = new URLSearchParams(window.location.search).get("sap-client") || "324";
                const sItemsUrl =
                  "/sap/opu/odata4/sap/zui_conf_req/srvd/sap/zsd_conf_req/0001/" +
                  "ZC_CONF_REQ_H(" + sReqId + ")/_Items" +
                  "?$top=1&$select=TargetCds&sap-client=" + sSapClient;
                const oResp = await fetch(sItemsUrl, {
                  credentials: "include",
                  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
                });
                if (oResp.ok) {
                  const oItemData = await oResp.json();
                  sTargetCds = oItemData.value?.[0]?.TargetCds || "";
                }
              } catch (eFetch) {
                console.warn("Could not fetch TargetCds from items:", eFetch);
              }
            }

            console.log("onOpenConfig params:", { sReqId, sConfId, sConfName, sModuleId, sTargetCds });

            const oPortMap = {
              ZI_MM_ROUTE_CONF: "8083",
              ZI_MM_SAFE_STOCK: "8084",
              ZI_SD_PRICE_CONF: "8085",
              ZI_FI_LIMIT_CONF: "8086",
            };

            const sPort = oPortMap[sTargetCds] || "8083";

            const sUrl =
              "http://localhost:" + sPort + "/test/flp.html" +
              "?sap-ui-xx-viewCache=false" +
              "&ReqId="    + encodeURIComponent(sReqId) +
              "&ConfId="   + encodeURIComponent(sConfId) +
              "&ConfName=" + encodeURIComponent(sConfName) +
              "&ModuleId=" + encodeURIComponent(sModuleId) +
              "&TargetCds="+ encodeURIComponent(sTargetCds) +
              "&Status="   + encodeURIComponent(sStatus) +
              "#app-preview";

            console.log("onOpenConfig navigating to:", sUrl);

            const oLink = document.createElement("a");
            oLink.href = sUrl;
            oLink.target = "_blank";
            oLink.rel = "noopener noreferrer";
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
          } catch (e) {
            console.error("onOpenConfig error:", e);
          }
        },
      },
    );
  },
);
