import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { UpdatePasswordComponent } from '@mm-modals/edit-user/update-password.component';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguagesService } from '@mm-services/languages.service';
import { UpdateUserService } from '@mm-services/update-user.service';
import { MmModal } from '@mm-modals/mm-modal/mm-modal';
import { Observable } from 'rxjs';

describe('UpdatePasswordComponent', () => {

  let component: UpdatePasswordComponent;
  let fixture: ComponentFixture<UpdatePasswordComponent>;
  let userSettingsService;
  let updateUserService;
  let languagesService;
  let translateService;

  beforeEach(async(() => {
    updateUserService = {
      update: sinon.stub().resolves({}),
    };
    userSettingsService = {
      get: sinon.stub().resolves(
        {
          _id: 'user123',
          name: 'admin',
          fullname: 'Admin',
          email: 'admin@demo.medic.com',
          phone: '+99 999 9999',
          language: 'es'
        }
      )
    };
    languagesService = {
      get: sinon.stub().resolves(
        [{code: 'en', name: 'English'}]
      )
    };
    translateService = { get: sinon.stub().returns(new Observable()) };
    return TestBed
      .configureTestingModule({
        imports: [
          FormsModule,
        ],
        declarations: [
          UpdatePasswordComponent,
          MmModal,
        ],
        providers: [
          { provide: UpdateUserService, useValue: updateUserService },
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: LanguagesService, useValue: languagesService },
          { provide: BsModalRef, useValue: new BsModalRef() },
          { provide: TranslateService, useValue: translateService }
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(UpdatePasswordComponent);
        component = fixture.componentInstance;

        // @ts-ignore
        sinon.stub(component, 'windowReload');

        fixture.detectChanges();
        return fixture.whenStable();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should state been initialized correctly', () => {
    expect(component.editUserModel).to.deep.equal({
      id: 'user123',
      username: 'admin',
      fullname: 'Admin',
      email: 'admin@demo.medic.com',
      phone: '+99 999 9999',
      language: { code: 'es' }
    });
    expect(component.errors).to.deep.equal({});
  });

  it('password must be filled', () => {
    component.editUserModel.password = '';
    component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('field is required');
    expect(translateService.get.getCall(0).args[1]).to.deep.equal({ field: 'password' });
    expect(updateUserService.update.called).to.equal(false);
  });

  it('password must be long enough', () => {
    component.editUserModel.password = '2sml4me';
    component.editUserModel.passwordConfirm = '2sml4me';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('password.length.minimum');
    expect(updateUserService.update.called).to.equal(false);
  });

  it('password must be hard to brute force', () => {
    component.editUserModel.password = 'password';
    component.editUserModel.passwordConfirm = 'password';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('password.weak');
    expect(updateUserService.update.called).to.equal(false);
  });

  it('error if password and confirm do not match', () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password + 'a';
    component.editUserModel.currentPassword = '2xml4me';
    component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('Passwords must match');
    expect(updateUserService.update.called).to.equal(false);
  });

  it('user is updated with password change', () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    const currentPassword = '2xml4me';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;
    component.editUserModel.currentPassword = currentPassword;
    component.updatePassword();
    expect(translateService.get.called).to.equal(false);
    expect(component.errors).to.deep.equal({});
    expect(updateUserService.update.called).to.equal(true);
    expect(updateUserService.update.getCall(0).args[0]).to.equal('admin');
    expect(updateUserService.update.getCall(0).args[1].password).to.equal(password);
    expect(updateUserService.update.getCall(0).args[2]).to.equal('admin');
    expect(updateUserService.update.getCall(0).args[3]).to.equal(currentPassword);
  });

  it('errors if current password is not provided', () => {
    const password = '1QrAs$$3%%kkkk445234234234';
    component.editUserModel.password = password;
    component.editUserModel.passwordConfirm = password;

    component.updatePassword();
    expect(translateService.get.called).to.equal(true);
    expect(translateService.get.getCall(0).args[0]).to.equal('field is required');
    expect(translateService.get.getCall(0).args[1]).to.deep.equal({ field: 'currentPassword' });
    expect(updateUserService.update.called).to.equal(false);
  });
});
