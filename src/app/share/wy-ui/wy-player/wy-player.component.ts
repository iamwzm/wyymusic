import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Inject } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { AppStoreModule } from '../../../store/index';
import { getSongList, getPlayList, getCurrentIndex, getPlayMode, getCurrentSong } from '../../../store/selectors/player.selector';
import { Song } from '../../../services/data-types/common.types';
import { PlayMode } from './player-type';
import { SetCurrentIndex, SetPlayMode, SetPlayList } from 'src/app/store/actions/player.actions';
import { Subscription, fromEvent } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { shuffle, findIndex } from 'src/app/utils/array';

const modeTypes: PlayMode[] = [{
  type: 'loop',
  label: '循环'
},{
  type: 'random',
  label: '随机'
},{
  type: 'singleLoop',
  label: '单曲循环'
}];


@Component({
  selector: 'app-wy-player',
  templateUrl: './wy-player.component.html',
  styleUrls: ['./wy-player.component.less']
})
export class WyPlayerComponent implements OnInit {
  
  // 播放滚动条和缓冲条进度控制
  percent = 0;
  bufferPercent = 0;

  songList: Song[];
  playList: Song[];
  currentIndex: number;
  currentSong: Song;

  duration: number;
  currentTime: number;

  // 播放状态
  playing = false;

  // 是否可以播放
  songRead = false;

  // 音量默认控制
  volume = 40;

  // 控制显示音量面板
  showVolumnPanel = false;

  // 是否显示播放列表
  showPanel = false;

  // 是否点击的是音量面板本身
  selfClick = false;

  private winClick: Subscription;

  //当前的播放顺序
  currentMode: PlayMode;
  modeCount = 0;


  @ViewChild('audio', { static: true }) private audio: ElementRef;
  private audioEl: HTMLAudioElement;


  constructor(
    private store$: Store<AppStoreModule>,
    @Inject(DOCUMENT) private doc: Document
  ) {
    const appStore$ = this.store$.pipe(select('player'));
    const stateArr = [{
      type: getSongList,
      cb: list => this.watchList(list, 'songList')
    }, {
      type: getPlayList,
      cb: list => this.watchList(list, 'playList')
    }, {
      type: getCurrentIndex,
      cb: index => this.watchCurrentIndex(index)
    }, {
      type: getPlayMode,
      cb: mode => this.watchPlayMode(mode)
    }, {
      type: getCurrentSong,
      cb: song => this.watchCurrentSong(song)
    }];

    stateArr.forEach(item => {
      appStore$.pipe(select(item.type)).subscribe(item.cb);
    })

  }

  ngOnInit() {
    this.audioEl = this.audio.nativeElement;
  }



  private watchList(list: Song[], type: string) {
    this[type] = list;
  }

  private watchCurrentIndex(index: number) {
    this.currentIndex = index;
  }

  private watchPlayMode(mode: PlayMode) {
    // console.log('mode :', mode);
    this.currentMode = mode;
    if (this.songList) {
      let list = this.songList.slice();
      if (mode.type === 'random') {
        list = shuffle(this.songList);
        this.updateCurrentIndex(list, this.currentSong);
      this.store$.dispatch(SetPlayList( { playList: list } ))
      }
    }
  }

  private watchCurrentSong(song: Song) {
    if (song) {
      this.currentSong = song;
      this.duration = song.dt /  1000;
      // console.log('song :', song);
    }
  }

  private updateCurrentIndex(list: Song[], song: Song) {
    const newIndex = findIndex(list, song);
    this.store$.dispatch(SetCurrentIndex({ currentIndex: newIndex }));
  }



  // 改变播放顺序方法

  changeMode() {

    this.store$.dispatch(SetPlayMode({ playMode: modeTypes[++this.modeCount % 3] }))
  }



  // 播放 暂停 事件
  onToggle() {
    if(!this.currentSong) {
      if(this.playList.length) {
        this.updateIndex(0);
      }
    } else{
        if (this.songRead) {
          this.playing = !this.playing;
          if (this.playing) {
          this.audioEl.play();
          } else {
          this.audioEl.pause();
          }
      }
    }
  }

  // 上一首 事件
  onPrev(index: number){
    if (!this.songRead) return;
    if (this.playList.length === 1) {
      this.loop();
    } else {
      const newIndex = index <= 0 ? this.playList.length - 1 : index;
      this.updateIndex(newIndex);
    }
  }

  // 下一首 事件
  onNext(index: number){
    if (!this.songRead) return;
    if (this.playList.length === 1) {
      this.loop();
    } else {
      const newIndex = index >= this.playList.length ? 0 : index;
      this.updateIndex(newIndex);
    }
  }
  
  //播放结束事件   
  onEnded() {
    this.playing = false;
    if (this.currentMode.type === 'singleLoop') {
      this.loop();
    } else {
      this.onNext(this.currentIndex + 1);
    }
  }

  // 单曲循环 方法
  private loop() {
    this.audioEl.currentTime = 0;
    this.play();
  }

  // 播放条滚动事件 随音乐播放时间滚动
  onPercentChange(per) {
    if (this.currentSong) {
      this.audioEl.currentTime = this.duration * (per / 100);
    }
  }

  // 控制音量  
  onVolumeChange(per: number) {
    //音量是0-1之间的值， per是0-100之间的值
    this.audioEl.volume = per / 100;
  }

  //控制音量面板显示隐藏事件
  toggleVolPanel(evt: MouseEvent) {
    this.togglePanel('showVolumnPanel');
  }

   // 播放列表
   toggListPanel() {
     if (this.songList.length) {
      this.togglePanel('showPanel');
     }
    
  }


  // 控制显示音量面板点击事件
  // 如果 this.showVolumnPanel 存在 则给他绑定全局 bindDocumentClickListener()方法，不存在则unbindDocumentClickListener() 来解绑
  // 把 showVolumPanel 和 showPanel 纳入一个属性 type
  togglePanel(type: string) {
    this [type] = !this [type];
    if (this.showVolumnPanel || this.showPanel) {
      this.bindDocumentClickListener();
    }else {
      this.unbindDocumentClickListener();
    }
  }


  // 音量面板绑定 bindDocumentClickListener() 事件
  private bindDocumentClickListener() {
    if (!this.winClick) {
      this.winClick = fromEvent(this.doc, 'click').subscribe(() => {
        if (!this.selfClick) { 
           // 设置了点击了播放器以外的部分就会消失
          this.showVolumnPanel = false;
          this.showPanel = false;
          this.unbindDocumentClickListener();
        }
        this.selfClick = false;
      });
    }
  }


  private unbindDocumentClickListener() {
    if (this.winClick) {
      this.winClick.unsubscribe();
      this.winClick = null;
    }
  }

  private updateIndex(index: number) {
    this.store$.dispatch(SetCurrentIndex({ currentIndex: index }));
    this.songRead = false;
  }

  onTimeUpdate(e: Event) {
    this.currentTime = (<HTMLAudioElement>e.target).currentTime;
    this.percent = ( this.currentTime / this.duration ) * 100;
    const buffered = this.audioEl.buffered;
    if (buffered.length && this.bufferPercent < 100) {
      this.bufferPercent = ( buffered.end(0) / this.duration ) * 100;
    }
  }

  onCanplay() {
    this.songRead = true;
    this.play();
  }

  private play() {
    this.audioEl.play();
    this.playing = true;
  }

  get picUrl(): string {
    return this.currentSong ? this.currentSong.al.picUrl : '//s4.music.126.net/style/web2/img/default/default_album.jpg';
  }

  // 切换歌曲播放
  onChangeSong(song: Song) {
    this.updateCurrentIndex(this.playList, song);
  }

}
