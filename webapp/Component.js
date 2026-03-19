sap.ui.define(
  ["sap/fe/core/AppComponent", "sap/ui/model/json/JSONModel"],
  function (AppComponent, JSONModel) {
    "use strict";

    return AppComponent.extend("zgsp26.conf.request.confrequestapp.Component", {
      metadata: {
        manifest: "json",
      },

      init: function () {
        const oCatalogCtx = this._buildCatalogContextFromUrl();
        this.setModel(new JSONModel(oCatalogCtx), "catalogCtx");

        AppComponent.prototype.init.apply(this, arguments);
      },

      _buildCatalogContextFromUrl: function () {
        const sUrl = window.location.href.split("#")[0];
        const oUrl = new URL(sUrl);
        const oParams = oUrl.searchParams;

        const oCatalogCtx = {
          mode: oParams.get("mode") || "",
          ConfId: oParams.get("ConfId") || "",
          ConfName: oParams.get("ConfName") || "",
          ModuleId: oParams.get("ModuleId") || "",
          TargetCds: oParams.get("TargetCds") || "",
          EnvId: oParams.get("EnvId") || "DEV",
        };

        oCatalogCtx.hasCatalogContext = !!oCatalogCtx.ConfId;
        oCatalogCtx.summaryText = oCatalogCtx.hasCatalogContext
          ? [
              oCatalogCtx.ConfName || "",
              oCatalogCtx.ModuleId || "",
              oCatalogCtx.EnvId || "",
            ]
              .filter(Boolean)
              .join(" | ")
          : "";

        return oCatalogCtx;
      },
    });
  },
);
