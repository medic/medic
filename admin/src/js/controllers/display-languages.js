var _ = require('underscore');

angular.module('controllers').controller('DisplayLanguagesCtrl',
  function (
    $log,
    $q,
    $scope,
    $timeout,
    $translate,
    Blob,
    Changes,
    DB,
    ExportProperties,
    Languages,
    Modal,
    Settings,
    TranslationLoader,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    var createLocaleModel = function(doc, totalTranslations) {
      var result = {
        doc: doc
      };

      var content = ExportProperties(doc);
      if (content) {
        result.export = {
          name: doc._id + '.properties',
          url: Blob.text(content)
        };
      }
      result.missing = totalTranslations - getTranslationKeys(doc).length;

      return result;
    };

    var setLanguageStatus = function(doc, enabled) {
      doc.enabled = enabled;
      DB().put(doc).catch(function(err) {
        $log.error('Error updating settings', err);
      });
    };

    const getTranslationKeys = doc => {
      return Object.keys(Object.assign({}, doc.generic || {}, doc.custom || {}));
    };

    const countTotalTranslations = (rows) => {
      let keys = rows.map(row => getTranslationKeys(row.doc));
      keys = _.uniq(_.flatten(keys));
      return keys.length;
    };

    var getLanguages = function() {
      $scope.loading = true;
      $q.all([
        DB().query('medic-client/doc_by_type', {
          startkey: [ 'translations', false ],
          endkey: [ 'translations', true ],
          include_docs: true
        }),
        Settings()
      ])
        .then(function(results) {
          var docs = results[0].rows;
          var settings = results[1];
          var totalTranslations = countTotalTranslations(docs);
          $scope.loading = false;
          $scope.languagesModel = {
            totalTranslations: totalTranslations,
            default: {
              locale: settings.locale,
              outgoing: settings.locale_outgoing
            },
            locales: _.map(docs, function(row) {
              return createLocaleModel(row.doc, totalTranslations);
            })
          };
        })
        .catch(function(err) {
          $scope.loading = false;
          $log.error('Error loading settings', err);
        });
    };

    const changeListener = Changes({
      key: 'update-languages',
      filter: change => TranslationLoader.test(change.id),
      callback: () => getLanguages()
    });

    $scope.$on('$destroy', changeListener.unsubscribe);

    $scope.editLanguage = function(doc) {
      Modal({
        templateUrl: 'templates/edit_language.html',
        controller: 'EditLanguageCtrl',
        model: doc
      });
    };
    $scope.disableLanguage = function(doc) {
      setLanguageStatus(doc, false);
    };
    $scope.enableLanguage = function(doc) {
      setLanguageStatus(doc, true);
    };
    $scope.prepareImport = function(doc) {
      Modal({
        templateUrl: 'templates/import_translation.html',
        controller: 'ImportTranslationCtrl',
        model: doc
      });
    };

    $scope.deleteDoc = function(doc) {
      Modal({
        templateUrl: 'templates/delete_doc_confirm.html',
        controller: 'DeleteDocConfirm',
        model: { doc: doc }
      });
    };

    getLanguages();

    $scope.submitLanguageSettings = function() {
      $scope.status = { loading: true };
      var settings = {
        locale: $scope.basicLanguagesModel.locale,
        locale_outgoing: $scope.basicLanguagesModel.locale_outgoing
      };
      UpdateSettings(settings)
        .then(function() {
          $scope.status = { success: true, msg: $translate.instant('Saved') };
          $timeout(function() {
            if ($scope.status) {
              $scope.status.success = false;
            }
          }, 3000);
        })
        .catch(function(err) {
          $log.error('Error updating language settings', err);
          $scope.status = { error: true, msg: $translate.instant('Error saving language settings') };
        });
    };

    Languages().then(function(languages) {
      $scope.enabledLocales = languages;
    });

    Settings()
      .then(function(res) {
        $scope.basicLanguagesModel = {
          locale: res.locale,
          locale_outgoing: res.locale_outgoing
        };
      })
      .catch(function(err) {
        $log.error('Error loading language settings', err);
      });

  }
);
