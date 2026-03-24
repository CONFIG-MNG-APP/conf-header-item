sap.ui.define(
  ["sap/fe/core/AppComponent", "sap/ui/model/json/JSONModel"],
  function (AppComponent, JSONModel) {
    "use strict";

    return AppComponent.extend("zgsp26.conf.request.confrequestapp.Component", {
      metadata: {
        manifest: "json",
      },

      init: function () {
        var oCatalogCtx = this._buildCatalogContextFromUrl();
        this.setModel(new JSONModel(oCatalogCtx), "catalogCtx");

        AppComponent.prototype.init.apply(this, arguments);

        // If launched from Catalog App with ConfId → navigate to CatalogLanding
        if (oCatalogCtx.hasCatalogContext) {
          this.getRouter().navTo("CatalogLanding", {}, true);
        }
      },

      _buildCatalogContextFromUrl: function () {
        var sUrl = window.location.href.split("#")[0];
        var oUrl = new URL(sUrl);
        var oParams = oUrl.searchParams;

        var oCatalogCtx = {
          mode:      oParams.get("mode")      || "",
          ConfId:    oParams.get("ConfId")    || "",
          ConfName:  oParams.get("ConfName")  || "",
          ModuleId:  oParams.get("ModuleId")  || "",
          TargetCds: oParams.get("TargetCds") || "",
          EnvId:     oParams.get("EnvId")     || "DEV",
        };

        oCatalogCtx.hasCatalogContext = !!oCatalogCtx.ConfId;
        oCatalogCtx.summaryText = oCatalogCtx.hasCatalogContext
          ? [oCatalogCtx.ConfName, oCatalogCtx.ModuleId, oCatalogCtx.EnvId]
              .filter(Boolean)
              .join(" | ")
          : "";

        return oCatalogCtx;
      },
    });
  },
);
