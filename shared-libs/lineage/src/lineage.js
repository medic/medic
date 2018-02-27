var _ = require('underscore'),
    utils = require('./utils');

module.exports = function(dependencies) {
  dependencies = dependencies || {};
  var Promise = dependencies.Promise;
  var DB = dependencies.DB;

  var buildHydratedDoc = function(doc, lineage) {
    if (!doc) {
      return;
    }
    var current = doc;
    if (doc.type === 'data_record') {
      doc.contact = lineage.shift();
      current = doc.contact;
    }
    while (current && current.parent && current.parent._id) {
      current.parent = lineage.shift();
      current = current.parent;
    }
  };

  var fillContactsInDocs = function(docs, contacts) {
    if (!contacts || !contacts.length) {
      return;
    }
    contacts.forEach(function(contactDoc) {
      docs.forEach(function(doc) {
        var id = doc && doc.contact && doc.contact._id;
        if (id === contactDoc._id) {
          doc.contact = contactDoc;
        }
      });
    });
  };

  var fetchContacts = function(lineage, patientLineage) {
    var lineages = lineage.concat(patientLineage);
    var contactIds = _.uniq(
      lineages
        .map(function(doc) {
          return doc && doc.contact && doc.contact._id;
        })
        .filter(function(id) {
          return !!id;
        })
    );

    // Only fetch docs that are new to us
    var lineageContacts = [];
    var contactsToFetch = [];
    contactIds.forEach(function(id) {
      var contact = lineage.find(function(doc) {
        return doc && doc._id === id;
      });
      if (contact) {
        lineageContacts.push(contact);
      } else {
        contactsToFetch.push(id);
      }
    });

    return fetchDocs(contactsToFetch)
      .then(function(fetchedContacts) {
        return lineageContacts.concat(fetchedContacts);
      });
  };

  var mergeLineages = function(lineage, patientLineage, contacts) {
    var lineages = lineage.concat(patientLineage);
    fillContactsInDocs(lineages, contacts);

    var doc = lineage.shift();
    buildHydratedDoc(doc, lineage);

    if (patientLineage.length) {
      var patientDoc = patientLineage.shift();
      buildHydratedDoc(patientDoc, patientLineage);
      doc.patient = patientDoc;
    }

    return doc;
  };

  var patientLineageByShortcode = function(shortcode) {
    return new Promise(function(resolve, reject) {
      return utils.getPatientContactUuid(shortcode, function(err, uuid) {
        if (err) {
          reject(err);
        } else {
          fetchLineageById(uuid)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  };

  var findPatientId = function(doc) {
    return (
      doc.type === 'data_record' &&
      ((doc.fields && doc.fields.patient_id) || doc.patient_id)
    );
  };

  var fetchPatientLineage = function(record) {
    var patientId = findPatientId(record);
    if (!patientId) {
      return Promise.resolve([]);
    }
    return patientLineageByShortcode(patientId);
  };

  var fetchLineageById = function(id) {
    var options = {
      startkey: [id],
      endkey: [id, {}],
      include_docs: true
    };
    return DB.query('medic-client/docs_by_id_lineage', options)
      .then(function(result) {
        return result.rows.map(function(row) {
          return row.doc;
        });
      });
  };

  var fetchHydratedDoc = function(id) {
    var lineage;
    var patientLineage;
    return fetchLineageById(id)
      .then(function(result) {
        lineage = result;
        if (lineage.length === 0) {
          // Not a doc that has lineage, just do a normal fetch.
          return DB.get(id);
        }

        return fetchPatientLineage(lineage[0])
          .then(function(result) {
            patientLineage = result;
            return fetchContacts(lineage, patientLineage);
          })
          .then(function(contacts) {
            mergeLineages(lineage, patientLineage, contacts);
          });
      });
  };

  // for data_records, include the first-level contact.
  var collectParentIds = function(docs) {
    var ids = [];
    docs.forEach(function(doc) {
      var parent = doc.parent;
      if (doc.type === 'data_record') {
        var contactId = doc.contact && doc.contact._id;
        if (!contactId) {
          return;
        }
        ids.push(contactId);
        parent = doc.contact;
      }
      while (parent) {
        if (parent._id) {
          ids.push(parent._id);
        }
        parent = parent.parent;
      }
    });
    return _.uniq(ids);
  };

  // for data_records, doesn't include the first-level contact (it counts as a parent).
  var collectLeafContactIds = function(partiallyHydratedDocs) {
    var ids = [];
    partiallyHydratedDocs.forEach(function(doc) {
      var current = doc;
      if (current.type === 'data_record') {
        current = current.contact;
      }
      while (current) {
        var contactId = current.contact && current.contact._id;
        if (contactId) {
          ids.push(contactId);
        }
        current = current.parent;
      }
    });
    return _.uniq(ids);
  };

  var fetchDocs = function(ids) {
    if (!ids || !ids.length) {
      return Promise.resolve([]);
    }
    return DB.allDocs({ keys: ids, include_docs: true })
      .then(function(results) {
        return results.rows
          .map(function(row) {
            return row.doc;
          })
          .filter(function(doc) {
            return !!doc;
          });
      });
  };

  var hydrateParents = function(docs, parents) {
    if (!parents || !parents.length) {
      return docs;
    }

    var findById = function(id, docs) {
      return docs.find(function(doc) {
        return doc._id === id;
      });
    };

    docs.forEach(function(doc) {
      var current = doc;
      if (doc.type === 'data_record') {
        var contactDoc = findById(current.contact._id, parents);
        if (contactDoc) {
          doc.contact = contactDoc;
        }
        current = doc.contact;
      }

      while (current) {
        if (current.parent && current.parent._id) {
          var parentDoc = findById(current.parent._id, parents);
          if (parentDoc) {
            current.parent = parentDoc;
          }
        }
        current = current.parent;
      }
    });
    return docs;
  };

  var hydrateLeafContacts = function(docs, contacts) {
    var subDocsToHydrate = [];
    docs.forEach(function(doc) {
      var current = doc;
      if (doc.type === 'data_record') {
        current = doc.contact;
      }
      while (current) {
        subDocsToHydrate.push(current);
        current = current.parent;
      }
    });
    fillContactsInDocs(subDocsToHydrate, contacts);
    return docs;
  };

  var hydratePatient = function(doc) {
    return fetchPatientLineage(doc).then(function(patientLineage) {
      if (patientLineage.length) {
        var patientDoc = patientLineage.shift();
        buildHydratedDoc(patientDoc, patientLineage);
        doc.patient = patientDoc;
      }
      return doc;
    });
  };

  var hydratePatients = function(docs) {
    return Promise.all(docs.map(hydratePatient)).then(function() {
      return docs;
    });
  };

  var hydrateDocs = function(docs) {
    if (!docs.length) {
      return Promise.resolve([]);
    }
    var parentIds = collectParentIds(docs);
    var hydratedDocs = JSON.parse(JSON.stringify(docs));
    return fetchDocs(parentIds)
      .then(function(parents) {
        hydrateParents(hydratedDocs, parents);
        return fetchDocs(collectLeafContactIds(hydratedDocs));
      })
      .then(function(contacts) {
        hydrateLeafContacts(hydratedDocs, contacts);
        return hydratePatients(hydratedDocs);
      });
  };

  // Minifies things you would attach to another doc:
  //   doc.parent = minify(doc.parent)
  // Not:
  //   minify(doc)
  var minifyLineage = function(parent) {
    if (!parent || !parent._id) {
      return parent;
    }

    var result = { _id: parent._id };
    while (parent.parent && parent.parent._id) {
      result.parent = { _id: parent.parent._id };
      result = result.parent;
      parent = parent.parent;
    }
    return result;
  };

  return {
    /**
     * Given a doc id get a doc and all parents, contact (and parents) and
     * patient (and parents)
     * @param id The id of the doc
     * @returns Promise
     */
    fetchHydratedDoc: fetchHydratedDoc,

    /**
     * Given an array of minified docs bind the parents and contacts
     * @param docs The array of docs to hydrate
     * @returns Promise
     */
    hydrateDocs: hydrateDocs,

    /**
     * Remove all hyrdrated items and leave just the ids
     * @param doc The doc to minify
     */
    minify: function(doc) {
      if (!doc) {
        return;
      }
      if (doc.parent) {
        doc.parent = minifyLineage(doc.parent);
      }
      if (doc.contact && doc.contact._id) {
        var miniContact = { _id: doc.contact._id };
        if (doc.contact.parent) {
          miniContact.parent = minifyLineage(doc.contact.parent);
        }
        doc.contact = miniContact;
      }
      if (doc.type === 'data_record') {
        delete doc.patient;
      }
    },

    fetchLineageById: fetchLineageById,
    minifyLineage: minifyLineage,
    fillContactsInDocs: fillContactsInDocs,
    buildHydratedDoc: buildHydratedDoc
  };
};
