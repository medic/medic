angular.module('controllers').controller('ExportReportsCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      Export('reports', { human: true });
    };

  }
);
