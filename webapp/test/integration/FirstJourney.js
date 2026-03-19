sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_CONF_REQ_HList.iSeeThisPage();
            Then.onTheZC_CONF_REQ_HList.onFilterBar().iCheckFilterField("ReqTitle");
            Then.onTheZC_CONF_REQ_HList.onFilterBar().iCheckFilterField("Module ID");
            Then.onTheZC_CONF_REQ_HList.onFilterBar().iCheckFilterField("Enviroment");
            Then.onTheZC_CONF_REQ_HList.onFilterBar().iCheckFilterField("Request Status");
            Then.onTheZC_CONF_REQ_HList.onTable().iCheckColumns(6, {"ReqTitle":{"header":"Request Title"},"ModuleId":{"header":"Module"},"EnvId":{"header":"Environment"},"Status":{"header":"Status"},"Reason":{"header":"Reason"},"CreatedAt":{"header":"Created At"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_CONF_REQ_HList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_CONF_REQ_HList.onTable().iCheckRows();

            When.onTheZC_CONF_REQ_HList.onTable().iPressRow(0);
            Then.onTheZC_CONF_REQ_HObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});