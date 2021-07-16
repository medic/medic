import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@mm-services/auth.service';
import { HeaderTabsService } from '@mm-services/header-tabs.service';

@Component({
  template: '',
})
export class HomeComponent implements OnInit {

  constructor(
    private authService:AuthService,
    private headerTabsService:HeaderTabsService,
    private router:Router,
  ) { }

  ngOnInit() {
    return this.headerTabsService
      .getPrimaryTab() // Not passing settings since icons aren't needed.
      .then(tab => {
        const nextRoute = tab?.route ? [ tab.route ] : [ 'error', '403' ];
        this.router.navigate(nextRoute);
      });
  }
}
