sap.ui.define(
  [
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Component",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  function (ControllerExtension, Component, Filter, FilterOperator) {
    "use strict";

    return ControllerExtension.extend(
      "zgsp26.conf.request.confrequestapp.ext.controller.RequestListExt",
      {
        override: {
          onInit: function () {
            const oCatalogCtx = this._getCatalogContext();
            console.log("Catalog context =", oCatalogCtx);

            if (oCatalogCtx?.ConfId) {
              this._waitAndApplyFilter(oCatalogCtx);
            }
          },

          onBeforeCreate: function (oEvent) {
            console.log("=== onBeforeCreate FIRED ===", oEvent);

            const oCatalogCtx = this._getCatalogContext();
            console.log("catalogCtx in onBeforeCreate =", oCatalogCtx);

            const oContext = oEvent.getParameter("context");
            console.log("create context =", oContext);

            if (!oCatalogCtx?.ConfId || !oContext) {
              console.warn("Missing catalogCtx or context");
              return;
            }

            oContext.setProperty("ConfId", oCatalogCtx.ConfId);
            oContext.setProperty("ModuleId", oCatalogCtx.ModuleId);
            oContext.setProperty("EnvId", oCatalogCtx.EnvId || "DEV");
            oContext.setProperty(
              "ReqTitle",
              oCatalogCtx.ConfName
                ? "Maintain " + oCatalogCtx.ConfName
                : "Maintain Configuration",
            );

            console.log("after set ConfId =", oContext.getProperty("ConfId"));
          },
        },

        _getAppComponent: function () {
          const oView = this.base.getView();

          return this.base.getAppComponent
            ? this.base.getAppComponent()
            : Component.getOwnerComponentFor(oView);
        },

        _getCatalogContext: function () {
          const oAppComponent = this._getAppComponent();
          return oAppComponent?.getModel("catalogCtx")?.getData() || {};
        },

        // 🔥 Đợi table render xong rồi filter
        _waitAndApplyFilter: function (oCatalogCtx) {
          const fnTry = () => {
            const oTable = this.base.byId(
              "zgsp26.conf.request.confrequestapp::ZC_CONF_REQ_HList--fe::table::ZC_CONF_REQ_H::LineItem",
            );

            if (!oTable) {
              setTimeout(fnTry, 300);
              return;
            }

            const oBinding = oTable.getBinding("items");

            if (!oBinding) {
              setTimeout(fnTry, 300);
              return;
            }

            this._applyFilter(oBinding, oCatalogCtx);
          };

          fnTry();
        },

        _applyFilter: function (oBinding, oCatalogCtx) {
          const aFilters = [];

          if (oCatalogCtx.ConfId) {
            aFilters.push(
              new Filter("ConfId", FilterOperator.EQ, oCatalogCtx.ConfId),
            );
          }

          console.log("Apply filter =", aFilters);

          oBinding.filter(aFilters);
        },
      },
    );
  },
);
