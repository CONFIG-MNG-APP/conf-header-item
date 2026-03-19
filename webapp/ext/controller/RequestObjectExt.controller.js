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
      },
    );
  },
);
