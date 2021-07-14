const utils = require('../../../utils');
const commonElements = require('../../../page-objects/common/common.po.js');
const contactPage = require('../../../page-objects/contacts/contacts.po.js');
const uuid = require('uuid');
const districtId = uuid.v4();
const districtName = uuid.v4();
const healthCenterId = uuid.v4();
const healtchCenterName = uuid.v4();
const personName = uuid.v4();
const personId = uuid.v4();
const personFactory = require('../../../factories/cht/contacts/person');
const place = require('../../../factories/cht/contacts/place');


describe('Editing contacts with the CHT config', () => {
  beforeAll(() => utils.saveDocs(expectedDocs));
  afterAll(() => utils.revertDb());

  const expectedDocs = [
    {
      _id: districtId,
      name: districtName,
      type: 'district_hospital',
      reported_date: Date.now()
    },
    {
      _id: healthCenterId,
      parent: {
        _id: districtId
      },
      name: healtchCenterName,
      type: 'health_center',
      reported_date: Date.now(),
      contact: {
        _id: personId,
        parent: {
          _id: healthCenterId,
          parent: { _id: districtId }
        }
      }
    },
    {
      type: 'person',
      _id: personId,
      name: personName,
      date_of_birth: '2000-02-01',
      sex: 'female',
      role: 'patient',
      parent: {
        _id: healthCenterId,
        parent: { _id: districtId }
      }
    }
  ];

  it('should remove the primary contact from the health center when the contact is deleted', async () => {
    await commonElements.goToPeople();
    await contactPage.selectLHSRowByText(healtchCenterName);
    await contactPage.deleteContactByName(expectedDocs[2].name);
    await commonElements.confirmDelete();
    await contactPage.selectLHSRowByText(healtchCenterName);
    expect(await contactPage.peopleRows.count()).toBe(0);
  });

  it('should change primary contact', async () => {
    const district = place.generateHierarchy(['district_hospital'])[0];
    const originalContact = personFactory.build(
      {
        parent: {
          _id: district._id,
          parent: district.parent
        }
      });
    
    const secondContact = personFactory.build(
      {
        parent: {
          _id: district._id,
          parent: district.parent
        }
      });
    district.contact = originalContact;
    await utils.saveDocs([district, originalContact, secondContact]);
    await browser.refresh();

    //change contact
    await utils.request({
      path: `/api/v1/places/${district._id}`,
      method: 'POST',
      body: {
        contact: secondContact._id
      }
    });

    await browser.refresh();
    const newDistrict = await utils.getDoc(district._id);
    expect(newDistrict.contact._id).toBe(secondContact._id);
  });
});
