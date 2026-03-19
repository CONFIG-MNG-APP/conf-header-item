sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'zgsp26.conf.request.confrequestapp',
            componentId: 'ZC_CONF_REQ_HObjectPage',
            contextPath: '/ZC_CONF_REQ_H'
        },
        CustomPageDefinitions
    );
});