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

            // Fetch current user role first, then apply all filters
            this._initUserRole().then((sRole) => {
              this._waitAndApplyFilter(oCatalogCtx, sRole);
            });
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

        /**
         * Get current SAP user ID from shell, then fetch their role from ZI_CURRENT_USER_ROLE.
         * Stores UserId and RoleLevel on this instance for later use.
         * Returns the RoleLevel string (trimmed), or '' if no role found.
         */
        _initUserRole: function () {
          // Get current user from SAP Fiori shell (sy-uname equivalent on frontend)
          const sCurrentUser =
            sap.ushell?.Container?.getService?.("UserInfo")?.getId?.() || "";
          this._currentUserId = sCurrentUser;

          if (!sCurrentUser) {
            this._currentUserRole = "";
            return Promise.resolve("");
          }

          const oModel = this.base.getView().getModel();
          const oBinding = oModel.bindList(
            "/ZI_CURRENT_USER_ROLE",
            undefined,
            undefined,
            [
              new Filter("UserId", FilterOperator.EQ, sCurrentUser),
              new Filter("IsActive", FilterOperator.EQ, true),
            ],
          );

          return oBinding
            .requestContexts(0, 1)
            .then((aContexts) => {
              if (aContexts.length > 0) {
                this._currentUserRole = (
                  aContexts[0].getProperty("RoleLevel") || ""
                ).trim();
              } else {
                this._currentUserRole = "";
              }
              console.log(
                "User role =",
                this._currentUserRole,
                "| UserId =",
                this._currentUserId,
              );
              return this._currentUserRole;
            })
            .catch(() => {
              this._currentUserRole = "";
              return "";
            });
        },

        // Wait for table to render then apply filters
        _waitAndApplyFilter: function (oCatalogCtx, sRole) {
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

            this._applyFilter(oBinding, oCatalogCtx, sRole);
          };

          fnTry();
        },

        _applyFilter: function (oBinding, oCatalogCtx, sRole) {
          const aFilters = [];

          // Filter by ConfId when navigating from catalog
          if (oCatalogCtx?.ConfId) {
            aFilters.push(
              new Filter("ConfId", FilterOperator.EQ, oCatalogCtx.ConfId),
            );
          }

          // KEY USER only sees their own requests
          if (sRole === "KEY USER" && this._currentUserId) {
            aFilters.push(
              new Filter("CreatedBy", FilterOperator.EQ, this._currentUserId),
            );
          }

          console.log("Apply filter =", aFilters);
          oBinding.filter(aFilters);
        },
      },
    );
  },
);
