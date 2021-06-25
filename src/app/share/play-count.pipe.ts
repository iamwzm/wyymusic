import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'playCount'
})
export class PlayCountPipe implements PipeTransform {

  // 设置数量优化 如果人数超过10000,则不显示一万后的数字，听歌曲人数以万为单位只显示多少万人
  transform(value: number): number | string {
    if (value > 10000) {
      return Math.floor(value / 10000) + '万';
    } else {
      return value;
    }
  }
}
