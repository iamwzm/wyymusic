import { Lyric } from '../../../../services/data-types/common.types';
import { findIndex } from '../../../../utils/array';
import { from, zip, Subject } from 'rxjs';
import { skip } from 'rxjs/internal/operators';


const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;


export interface BaseLyricLine {
  txt: string;
  txtCn: string;
}

interface LyricLine extends BaseLyricLine {
  time: number;
}

interface Handler extends BaseLyricLine {
  lineNum: number;
}



export class WyLyric {
  private lrc: Lyric;
  lines: LyricLine[] = [];

  private playing = false;

  private curNum: number;
  private startStamp: number;
  private pauseStamp: number;

  handler = new Subject<Handler>();

  private timer: any;

  constructor(lrc: Lyric) {
    this.lrc = lrc;
    this.init();
  }


  private init() {
    if (this.lrc.tlyric) {
      this.generTLyric();
    }else {
      this.generLyric();
    }
  }

  private generLyric() {
    const lines = this.lrc.lyric.split('\n');
    lines.forEach(line => this.makeLine(line));
    // console.log('lines :', this.lines);
  }

  private generTLyric() {
    const lines = this.lrc.lyric.split('\n');
    const tlines = this.lrc.tlyric.split('\n').filter(item => timeExp.exec(item) !== null);
    // console.log('lines :', lines);
    // console.log('tlines :', tlines);

    const moreLine = lines.length - tlines.length;

    let tempArr = [];
    if (moreLine >= 0) {
      tempArr = [lines, tlines];
    }else {
      tempArr = [tlines, lines];
    }

    const first = timeExp.exec(tempArr[1][0])[0];
    console.log('first :', first);

    const skipIndex = tempArr[0].findIndex(item => {
      const exec = timeExp.exec(item);
      if (exec) {
        return exec[0] === first;
      }
    });

    const _skip= skipIndex === -1 ? 0 : skipIndex;
    const skipItems = tempArr[0].slice(0, _skip);
    if (skipItems.length) {
      skipItems.forEach(line => this.makeLine(line));
    }
    // console.log('this.lines :', this.lines);

    let zipLines$;
    if (moreLine > 0) {
      zipLines$ = zip(from(lines).pipe(skip(_skip)), from(tlines));
    }else {
      zipLines$ = zip(from(lines), from(tlines).pipe(skip(_skip)));
    }
    // zipLines$.subscribe(([line, tline]))
    zipLines$.subscribe(([line, tline]) => this.makeLine(line, tline));
  }


  private makeLine(line: string, tline = '') {
    const result = timeExp.exec(line);
    // console.log('result :', result);
    if (result) {
      const txt = line.replace(timeExp, '').trim();
      const txtCn = tline ? tline.replace(timeExp, '').trim() : '';
      if (txt) {
        const thirdResult = result[3] || '00';
        const len = thirdResult.length;
        const _thirdResult = len > 2 ? parseInt(thirdResult) : parseInt(thirdResult) * 10;
        const time = Number(result[1]) * 60 * 1000 + Number(result[2]) * 1000 + _thirdResult;
        this.lines.push({ txt, txtCn, time });
      }
    }
  }

  play(startTime = 0) {
    if (!this.lines.length) return;
    if (!this.playing) {
      this.playing = true;
    }

    this.curNum = this.findCurNum(startTime);
    console.log('curNum :', this.curNum);
    this.startStamp = Date.now() - startTime;
    // this.callHandler()

    if (this.curNum < this.lines.length) {
      clearTimeout(this.timer);
      this.playReset();
    }

  }

  private playReset() {
    let line = this.lines[this.curNum];
    const delay = line.time - (Date.now() - this.startStamp);
    this.timer = setTimeout(() => {
      this.callHandler(this.curNum++);
      if (this.curNum < this.lines.length && this.playing) {
        this.playReset();
      }
    }, delay);
  }


  private callHandler(i: number) {
    this.handler.next({
      txt: this.lines[i].txt,
      txtCn: this.lines[i].txtCn,
      lineNum: i
    });
  }


  private findCurNum(time: number): number {
    const index = this.lines.findIndex(item => time <= item.time);
    return index === -1 ? this.lines.length - 1 : index;
  }

  togglePlay(playing: boolean) {
    const now  = Date.now();
    this.playing = playing;
    if (playing) {
      const startTime = (this.pauseStamp || now) - (this.startStamp || now);
      this.play(startTime);
    }else {
      this.stop();
      this.pauseStamp = now;
    }
  }

  private stop() {
    if (this.playing) {
      this.playing = false;
    }
    clearTimeout(this.timer);
  }
}