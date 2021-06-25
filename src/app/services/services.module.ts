import { NgModule, InjectionToken, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const API_CONFIG = new InjectionToken('ApiConfigToken');
export const WINDOW = new InjectionToken('WindowToken');

@NgModule({
  declarations: [],
  imports: [
    
  ],
  // 设置登录令牌 优化Url  以API_CONFIG 代替 localhost:8000/
  providers: [
    { provide: API_CONFIG, useValue: 'http://localhost:8080/' },
    { 
      provide: WINDOW, 
      useFactory(platformId: Object): Window | Object {
        return isPlatformBrowser(platformId) ? window: {};
      },
      deps: [PLATFORM_ID]
    }
  ]
})
export class ServicesModule { }
