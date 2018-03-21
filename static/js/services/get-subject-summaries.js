var _ = require('underscore');

angular.module('inboxServices').factory('GetSubjectSummaries',
  function(
    $q,
    DB,
    LineageModelGenerator
  ) {

    'use strict';
    'ngInject';

    var findSubjectId = function(response, id) {
      var parent = _.find(response.rows, function(row) {
        return id && row.key[1] === id.toString() || false;
      });
      return (parent && parent.id) || null;
    };

    var replaceReferencesWithIds = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.subject.type === 'reference' && summary.subject.value) {
          var id = findSubjectId(response, summary.subject.value);
          if (id) {
            summary.subject = {
              value: id,
              type: 'id'
            };
          } else {
            //update the type only, in case patient_id contains a doc UUID
            summary.subject.type = 'id';
          }
        }
      });

      return summaries;
    };

    var findSubjectName = function(response, id) {
      var parent = _.findWhere(response.rows, { id: id });
      return (parent && parent.value && parent.value.name) || null;
    };

    var findSubjectLineage = function(lineage, id) {
      return _.findWhere(lineage, {_id: id});
    };

    var replaceIdsWithNames = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.subject && summary.subject.type === 'id' && summary.subject.value) {
          var name = findSubjectName(response, summary.subject.value);
          if (name) {
            summary.subject = {
              _id: summary.subject.value,
              value: name,
              type: 'name'
            };
          }
        }
      });
      return summaries;
    };

    var processContactIds = function(summaries) {
      var ids = _.uniq(_.compact(summaries.map(function(summary) {
        if (summary.subject && summary.subject.type === 'id') {
          return summary.subject.value;
        }
      })));

      if (!ids.length) {
        return $q.resolve(summaries);
      }

      return DB()
        .query('medic-client/doc_summaries_by_id', { keys: ids })
        .then(function(response) {
          return replaceIdsWithNames(summaries, response);
        });
    };


    var validateSubjects = function(summaries) {
      summaries.forEach(function(summary) {
        if (!summary.subject) {
          return;
        }

        summary.validSubject = true;

        if (!summary.subject.type) {
          summary.subject.value = summary.contact || summary.from;
        } else if (summary.subject.type !== 'name' || !summary.subject.value) {
          summary.validSubject = false;
        }
      });

      return summaries;
    };

    var processReferences = function(summaries) {
      var references = _.uniq(_.compact(summaries.map(function(summary) {
        if (summary.subject && summary.subject.type === 'reference') {
          return summary.subject.value;
        }
      })));

      if (!references.length) {
        return $q.resolve(summaries);
      }

      references.forEach(function(reference, key) {
        references[key] = ['shortcode', reference];
      });

      return DB()
        .query('medic-client/contacts_by_reference', { keys: references })
        .then(function(response) {
          return replaceReferencesWithIds(summaries, response);
        });
    };

    var hydrateSubjectLineages = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.subject && summary.subject._id) {
          var lineage = findSubjectLineage(response, summary.subject._id);
          if (lineage) {
            _.extend(summary.subject, lineage);
          }
        }
      });
      return summaries;
    };

    var processPatientLineage = function(summaries) {
      var subjectIds = _.uniq(_.compact(summaries.map(function(summary) {
        return summary.subject && summary.subject._id;
      })));

      if (!subjectIds.length) {
        return $q.resolve(summaries);
      }

      var promises = subjectIds.map(function(id) {
        return LineageModelGenerator
          .reportPatient(id)
          .then(function(result) {
            result.compactLineage = _.compact(_.map(result.lineage, function(parent) {
              return parent && parent.name;
            }));

            return result;
          });
      });

      return $q
        .all(promises)
        .then(function(response) {
          return hydrateSubjectLineages(summaries, response);
        });
    };

    return function(summaries) {
      var containsReports = false;
      summaries.forEach(function (summary) {
        if (summary.form) {
          containsReports = true;
        }
      });

      if (!containsReports) {
        return $q.resolve(summaries);
      }

      return processReferences(summaries)
        .then(processContactIds)
        .then(processPatientLineage)
        .then(validateSubjects);
    };
  }
);
