import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements AfterViewInit {
  @ViewChild('tileBg', { static: true }) tileBgRef!: ElementRef<SVGElement>;
  @Output() dismissed = new EventEmitter<void>();

  fadingOut = false;

  ngAfterViewInit() {
    const el = this.tileBgRef.nativeElement;
    const w = el.closest('.splash')?.clientWidth ?? 390;
    const h = el.closest('.splash')?.clientHeight ?? 844;
    this.buildGrid(el, w, h, Math.round(w * 0.097), 7919);

    setTimeout(() => {
      this.fadingOut = true;
      setTimeout(() => this.dismissed.emit(), 600);
    }, 2000);
  }

  private mkRng(seed: number) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  private buildGrid(svgEl: SVGElement, W: number, H: number, R: number, seed: number) {
    const rng = this.mkRng(seed);
    // Threadily's motif: a loose grid of rounded word tiles (Trivily used hexes).
    const size = R * 1.15;
    const step = R * 1.4;
    const cols = Math.ceil(W / step) + 2;
    const rows = Math.ceil(H / step) + 2;
    const ox = -step * 0.5;
    const oy = -step * 0.5;
    const CX = W * 0.5;
    const CY = H * 0.5;
    const parts: string[] = [];

    for (let ci = 0; ci < cols; ci++) {
      for (let ri = 0; ri < rows; ri++) {
        const hx = ox + ci * step;
        const hy = oy + ri * step;
        const ndx = (hx - CX) / (W * 0.52);
        const ndy = (hy - CY) / (H * 0.40);
        const dist = Math.sqrt(ndx * ndx + ndy * ndy);
        const rv = rng();

        let prob: number;
        if      (dist < 0.28) prob = 0.00;
        else if (dist < 0.44) prob = 0.14;
        else if (dist < 0.60) prob = 0.42;
        else if (dist < 0.78) prob = 0.70;
        else if (dist < 0.96) prob = 0.84;
        else                  prob = 0.93;

        if (rv > prob) continue;

        const rv2 = rng();
        const rv3 = rng();

        let fill: string, stroke: string, sw: number;

        if (dist < 0.46) {
          const a = (0.10 + rv2 * 0.12).toFixed(2);
          fill   = `rgba(200,194,242,${a})`;
          stroke = 'rgba(79,58,244,0.07)';
          sw     = 0.5;
        } else if (dist < 0.66) {
          if (rv2 < 0.40) {
            fill   = 'none';
            stroke = `rgba(79,58,244,${(0.13 + rv3 * 0.10).toFixed(2)})`;
            sw     = 0.85;
          } else {
            const shade = rv3 < 0.55 ? '200,194,242' : '221,216,246';
            fill   = `rgba(${shade},${(0.25 + rv2 * 0.22).toFixed(2)})`;
            stroke = 'rgba(79,58,244,0.09)';
            sw     = 0.75;
          }
        } else {
          if (rv2 < 0.22) {
            fill   = 'none';
            stroke = `rgba(79,58,244,${(0.17 + rv3 * 0.15).toFixed(2)})`;
            sw     = 1;
          } else if (rv2 < 0.91) {
            const shade = rv3 < 0.40
              ? '200,194,242'
              : rv3 < 0.74 ? '221,216,246' : '234,231,253';
            fill   = `rgba(${shade},${(0.38 + rv2 * 0.30).toFixed(2)})`;
            stroke = 'rgba(79,58,244,0.12)';
            sw     = 0.85;
          } else {
            if (rv3 < 0.5) {
              fill   = 'rgba(34,197,94,0.10)';
              stroke = 'rgba(34,197,94,0.22)';
            } else {
              fill   = 'rgba(245,190,46,0.10)';
              stroke = 'rgba(245,190,46,0.24)';
            }
            sw = 0.85;
          }
        }

        parts.push(
          `<rect x="${(hx - size / 2).toFixed(1)}" y="${(hy - size / 2).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.24).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
        );
      }
    }

    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.innerHTML = parts.join('');
  }
}
