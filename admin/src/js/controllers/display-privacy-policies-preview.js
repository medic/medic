angular
  .module('controllers')
  .controller('DisplayPrivacyPoliciesPreview', function(
    $log,
    $sce,
    $scope,
    $timeout,
    $uibModalInstance,
    PrivacyPolicies
  ) {
    'use strict';
    'ngInject';

    const getTrustedHtml = string => {
      return $sce.trustAsHtml(PrivacyPolicies.decodeUnicode(string));
    };

    $scope.cancel = () => $uibModalInstance.dismiss();

    const validateFileType = () => {
      const accept = 'text/html';
      if ($scope.model.attachment) {
        return $scope.model.attachment.content_type === accept;
      }
      if ($scope.model.file) {
        return $scope.model.file.type === accept;
      }
    };

    if (!validateFileType()) {
      $scope.status = { error: 'display.privacy.policies.preview.wrong.type' };
      return;
    }

    if ($scope.model.attachment) {
      $scope.content = getTrustedHtml($scope.model.attachment.data);
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        $timeout(() => $scope.content = $sce.trustAsHtml(ev.target.result));
      };
      reader.onerror = ev => {
        $timeout(() => {
          $log.error('Error loading file contents', ev);
          $scope.status = { error: 'display.privacy.policies.preview.error' };
        });
      };
      reader.readAsText($scope.model.file, 'utf-8');
    }

  });
