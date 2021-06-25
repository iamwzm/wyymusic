import { Injectable, Inject } from '@angular/core';
import { ServicesModule, API_CONFIG } from './services.module';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Banner, HotTag, SongSheet } from './data-types/common.types';
import { map } from 'rxjs/internal/operators';

@Injectable({
  providedIn: ServicesModule
})
export class HomeService {

  constructor(private http: HttpClient, @Inject(API_CONFIG) private uri: string) { }

  // 导航栏轮播图
  getBanners(): Observable<Banner[]> {
    return this.http.get(this.uri + 'banner')
    .pipe(map((res: { banners: Banner[] }) => res.banners));
  }

 
  // 热门推荐   (0，5) 控制列表条数
  getHotTags(): Observable<HotTag[]> {
    return this.http.get(this.uri + 'playlist/hot')
      .pipe(map((res: { tags: HotTag[] }) => {
        return res.tags.sort((x: HotTag, y: HotTag) => x.position - y.position).slice(0, 5);
      }));
  }

  // 控制歌单封面数量 默认16
  getPerosonalSheetList(): Observable<SongSheet[]> {
    return this.http.get(this.uri + 'personalized')
      .pipe(map((res: { result: SongSheet[] }) => res.result.slice(0, 16)));
  }
}
