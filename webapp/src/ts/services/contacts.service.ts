import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { ContactTypesService } from './contact-types.service';
import { DbService } from './db.service';
import { flattenDeep as _flattenDeep } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class ContactsService {
  private inited;

  constructor(
    private cacheService:CacheService,
    private contactTypesService:ContactTypesService,
    private dbService:DbService,
  ) {
    this.inited = this.init();
  }

  private init() {
    return this.contactTypesService
      .getPlaceTypes()
      .then(types => {
        const cacheByType = {};
        types.forEach(type => {
          cacheByType[type.id] = this.cacheService.register({
            get: (callback) => {
              return this.dbService
                .get()
                .query('medic-client/contacts_by_type', { include_docs: true, key: [type.id] })
                .then((result) => {
                  callback(null, result.rows.map(row => row.doc));
                })
                .catch(callback);
            },
            invalidate: (doc) => type.id === (doc.contact_type || doc.type),
          });
        });
        return cacheByType;
      });
  }

  get(types) {
    if (!types) {
      // For admins this involves downloading a _huge_ amount of data.
      return Promise.reject(new Error('Call made to Contacts requesting no types'));
    }

    return this.inited.then(cacheByType => {
      const relevantCaches = types.map(type => {
        return new Promise((resolve, reject) => {
          cacheByType[type]((err, result) => err ? reject(err) : resolve(result));
        });
      });

      return Promise
        .all(relevantCaches)
        .then(results => _flattenDeep(results));
    });
  }
}

