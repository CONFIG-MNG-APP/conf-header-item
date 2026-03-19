sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"zgsp26/conf/request/confrequestapp/test/integration/pages/ZC_CONF_REQ_HList",
	"zgsp26/conf/request/confrequestapp/test/integration/pages/ZC_CONF_REQ_HObjectPage",
	"zgsp26/conf/request/confrequestapp/test/integration/pages/ZC_CONF_REQ_IObjectPage"
], function (JourneyRunner, ZC_CONF_REQ_HList, ZC_CONF_REQ_HObjectPage, ZC_CONF_REQ_IObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('zgsp26/conf/request/confrequestapp') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_CONF_REQ_HList: ZC_CONF_REQ_HList,
			onTheZC_CONF_REQ_HObjectPage: ZC_CONF_REQ_HObjectPage,
			onTheZC_CONF_REQ_IObjectPage: ZC_CONF_REQ_IObjectPage
        },
        async: true
    });

    return runner;
});

