// src/app/features/reportes/estadisticas/estadisticas-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { EstadisticasApi } from '@core/api/estadisticas/estadisticas-api';
import {
  EstadisticasTipoPunto,
  Granularidad
} from '@core/api/estadisticas/estadisticas.models';
import { parseApiError } from '@core/api/api-error';
import { getLimaTodayString } from '@shared/format/date.util';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Button } from '@shared/ui/button/button';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { formatCurrency } from '@shared/format/number.util';

type GranularidadUi = Granularidad | 'AUTO';
type SerieKey = 'entrada' | 'salida';

interface ItemEstadistica {
  fecha: string;
  label: string;
  /** Unidades: se conservan para detectar períodos con actividad. */
  entrada: number;
  salida: number;
  ajuste: number;
  /** Costos del período, en soles. Solo se usan entradas y salidas. */
  costoEntrada: number;
  costoSalida: number;
}

/** Meses máximos del rango por granularidad (deben coincidir con el backend). */
const MESES_MAX: Record<Granularidad, number> = { DAY: 12, WEEK: 24, MONTH: 60 };
const MESES_MAX_TEXTO: Record<Granularidad, string> = {
  DAY: '12 meses',
  WEEK: '24 meses',
  MONTH: '60 meses'
};
const GRAN_NOMBRE: Record<Granularidad, string> = { DAY: 'Día', WEEK: 'Semana', MONTH: 'Mes' };
const GRAN_LABEL: Record<Granularidad, string> = { DAY: 'día', WEEK: 'semana', MONTH: 'mes' };
const AUTO_MAX_DIAS_DAY = 31;
const AUTO_MAX_DIAS_WEEK = 182;

/** Períodos visibles al inicio y ampliación al pedir anteriores. */
const VENTANA_INICIAL: Record<Granularidad, number> = { DAY: 30, WEEK: 12, MONTH: 12 };
const AMPLIACION_VENTANA = 2;
/** A partir de este número de períodos se ocultan marcadores y la tabla arranca colapsada. */
const UMBRAL_DETALLE = 31;

// Geometría del gráfico (viewBox 800 x 290)
const LEFT = 72;
const RIGHT = 772;
const TOP = 30;
const BOTTOM = 220;

/** Dos series diferenciadas por trazo y forma de marcador, sin hexadecimales. */
const SERIES_CONFIG: {
  key: SerieKey;
  label: string;
  color: string;
  dash: string;
  marker: 'circle' | 'square';
}[] = [
  { key: 'entrada', label: 'Costo que entra', color: 'var(--color-success)', dash: '', marker: 'circle' },
  { key: 'salida', label: 'Costo que sale', color: 'var(--color-primary)', dash: '6 4', marker: 'square' }
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Suma meses a una fecha yyyy-MM-dd recortando el día al último del mes (como java.time). */
function addMonthsIso(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (m - 1) + meses;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const ultimo = new Date(ny, nm + 1, 0).getDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, ultimo))}`;
}

function addDaysIso(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + dias);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Mes actual en Lima: del día 1 hasta hoy, sin fechas futuras. */
function getRangoMesActual(): { desde: string; hasta: string } {
  const hoy = getLimaTodayString();
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
}

function limitarAHoy(iso: string): string {
  const hoy = getLimaTodayString();
  return iso > hoy ? hoy : iso;
}

/** Última fecha "hasta" permitida para un "desde" y una granularidad. */
function maxHasta(from: string, gran: Granularidad): string {
  return addDaysIso(addMonthsIso(from, MESES_MAX[gran]), -1);
}

/** Días (inclusive) entre dos fechas yyyy-MM-dd. */
function diasEntre(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

/** Granularidad automática según el número de días consultados. */
function granularidadAuto(from: string, to: string): Granularidad {
  if (!from || !to || to < from) return 'DAY';
  const dias = diasEntre(from, to);
  if (dias <= AUTO_MAX_DIAS_DAY) return 'DAY';
  if (dias <= AUTO_MAX_DIAS_WEEK) return 'WEEK';
  return 'MONTH';
}

/** Tope "redondo" del eje Y con 4 intervalos enteros. */
function maximoEje(max: number): number {
  const crudo = Math.max(1, Math.ceil(max / 4));
  const magnitud = Math.pow(10, Math.floor(Math.log10(crudo)));
  const base = crudo / magnitud;
  const candidatos = [1, 2, 3, 4, 5, 6, 8, 10];
  const mult = candidatos.find(c => c >= base) ?? 10;
  return mult * magnitud * 4;
}

function xAt(i: number, n: number): number {
  return n <= 1 ? (LEFT + RIGHT) / 2 : LEFT + (i * (RIGHT - LEFT)) / (n - 1);
}

function yAt(v: number, max: number): number {
  return BOTTOM - (v / max) * (BOTTOM - TOP);
}

/** Etiquetas del eje Y: moneda sin decimales. */
function formatoEje(n: number): string {
  return formatCurrency(n, 0);
}

/** Montos del tooltip: moneda con dos decimales. */
function formatoMonto(n: number): string {
  return formatCurrency(n);
}

@Component({
  selector: 'app-estadisticas-page',
  standalone: true,
  imports: [FormsModule, PageHeader, Button, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estadisticas-page.html',
  styleUrl: './estadisticas-page.css'
})
export class EstadisticasPage implements OnInit {
  protected readonly Math = Math;
  private readonly estadisticasApi = inject(EstadisticasApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly from = signal('');
  readonly to = signal('');
  readonly granularity = signal<GranularidadUi>('AUTO');
  readonly avisoAjuste = signal('');

  readonly puntos = signal<EstadisticasTipoPunto[]>([]);
  /** Granularidad con la que se pidieron los datos actuales (para las etiquetas). */
  private readonly dataGranularity = signal<Granularidad>('DAY');
  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  /** Contador de peticiones: descarta respuestas de rangos ya abandonados. */
  private reqGrafico = 0;

  // Interacción del gráfico
  readonly hoverIdx = signal<number | null>(null);
  readonly ventana = signal<number>(VENTANA_INICIAL.DAY);
  private readonly tablaManual = signal<boolean | null>(null);
  readonly seriesConfig = SERIES_CONFIG;

  // ── Validación del rango ──────────────────────────────────────────────────
  /** En automático aplica el tope más amplio (mes). */
  private readonly granLimite = computed<Granularidad>(() =>
    this.granularity() === 'AUTO' ? 'MONTH' : (this.granularity() as Granularidad)
  );

  /** Granularidad efectiva enviada a la API. */
  readonly granEfectiva = computed<Granularidad>(() => {
    const g = this.granularity();
    return g === 'AUTO' ? granularidadAuto(this.from(), this.to()) : g;
  });

  readonly granularidadLabel = computed(() => GRAN_LABEL[this.dataGranularity()]);
  readonly mesesMaxTexto = computed(() => MESES_MAX_TEXTO[this.granLimite()]);

  readonly rangoHint = computed(() =>
    this.granularity() === 'AUTO'
      ? `Rango máximo: ${this.mesesMaxTexto()}. La granularidad (${GRAN_NOMBRE[this.granEfectiva()]} para este rango) se elige según los días consultados.`
      : `Rango máximo con granularidad ${GRAN_NOMBRE[this.granLimite()]}: ${this.mesesMaxTexto()}.`
  );

  readonly maxHastaPermitido = computed(() => {
    const from = this.from();
    return from ? limitarAHoy(maxHasta(from, this.granLimite())) : null;
  });

  readonly rangoError = computed(() => {
    const from = this.from();
    const to = this.to();
    if (!from || !to) return 'Selecciona ambas fechas.';
    if (to < from) return 'La fecha final no puede ser anterior a la inicial.';
    if (to > maxHasta(from, this.granLimite())) {
      return this.granularity() === 'AUTO'
        ? `El rango no puede superar ${this.mesesMaxTexto()}.`
        : `Con granularidad ${GRAN_NOMBRE[this.granLimite()]} el rango no puede superar ${this.mesesMaxTexto()}.`;
    }
    return '';
  });

  // ── Datos derivados ───────────────────────────────────────────────────────
  readonly items = computed<ItemEstadistica[]>(() =>
    this.puntos().map(p => ({
      fecha: p.fecha,
      label: this.formatLabel(p.fecha, this.dataGranularity()),
      entrada: p.entrada,
      salida: p.consumo,
      ajuste: p.ajuste,
      costoEntrada: p.costoEntradas ?? 0,
      costoSalida: p.costoConsumos ?? 0
    }))
  );

  readonly totalCostoEntradas = computed(() => this.items().reduce((s, i) => s + i.costoEntrada, 0));
  readonly totalCostoSalidas = computed(() => this.items().reduce((s, i) => s + i.costoSalida, 0));

  readonly hayDatos = computed(() => this.items().some(i =>
    i.entrada + i.salida + i.ajuste > 0 || i.costoEntrada + i.costoSalida > 0
  ));
  readonly periodosActivos = computed(() => this.items().filter(i =>
    i.entrada + i.salida + i.ajuste > 0
  ).length);

  /** Ventana deslizante: solo los períodos más recientes. */
  readonly visibleItems = computed(() => {
    const items = this.items();
    const v = this.ventana();
    return items.length <= v ? items : items.slice(items.length - v);
  });
  readonly hayAnteriores = computed(() => this.items().length > this.visibleItems().length);
  readonly tablaVisible = computed(() => this.tablaManual() ?? this.items().length <= UMBRAL_DETALLE);

  readonly chartAria = computed(() =>
    `Gráfico de líneas de costos por ${this.granularidadLabel()}. Costo de entradas ${formatCurrency(this.totalCostoEntradas())} y de salidas ${formatCurrency(this.totalCostoSalidas())} en ${this.items().length} períodos.`
  );

  private valorSerie(item: ItemEstadistica, key: SerieKey): number {
    return key === 'entrada' ? item.costoEntrada : item.costoSalida;
  }

  /** Geometría del gráfico de líneas: ejes, dos series, etiquetas y zonas de hover. */
  readonly chart = computed(() => {
    const items = this.visibleItems();
    const n = items.length;
    const maxDato = items.reduce(
      (m, it) => Math.max(m, this.valorSerie(it, 'entrada'), this.valorSerie(it, 'salida')),
      0
    );
    const max = maximoEje(maxDato);

    const ticks = [0, 1, 2, 3, 4].map(k => {
      const valor = (max / 4) * k;
      return { valor, texto: formatoEje(valor), y: yAt(valor, max) };
    });

    const series = SERIES_CONFIG.map(s => {
      const circles = items.map((it, i) => ({ x: xAt(i, n), y: yAt(this.valorSerie(it, s.key), max) }));
      return {
        key: s.key,
        color: s.color,
        dash: s.dash,
        marker: s.marker,
        points: circles.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
        circles
      };
    });

    const maxEtiquetas = this.dataGranularity() === 'WEEK' ? 10 : 14;
    const paso = Math.max(1, Math.ceil(n / maxEtiquetas));
    const xLabels = items
      .map((it, i) => ({ i, x: xAt(i, n), label: it.label }))
      .filter(l => l.i % paso === 0);

    const slotW = n <= 1 ? RIGHT - LEFT : (RIGHT - LEFT) / (n - 1);
    const slots = items.map((_, i) => ({ i, x: xAt(i, n) - slotW / 2, w: slotW }));

    return {
      ticks,
      series,
      xLabels,
      slots,
      rotarLabels: xLabels.length > 8,
      mostrarMarcadores: n <= UMBRAL_DETALLE,
      max
    };
  });

  readonly tooltip = computed(() => {
    const idx = this.hoverIdx();
    const items = this.visibleItems();
    if (idx === null || !items[idx]) return null;

    const it = items[idx];
    const n = items.length;
    const max = this.chart().max;
    // El backend ya entrega los costos con dos decimales: aquí solo se formatean.
    const lines = SERIES_CONFIG.map(s => ({
      label: s.label,
      valor: formatoMonto(this.valorSerie(it, s.key)),
      color: s.color
    }));

    const x = xAt(idx, n);
    const boxW = 150;
    const boxH = 26 + lines.length * 16;
    const boxX = x + 12 + boxW > RIGHT + 8 ? x - 12 - boxW : x + 12;

    return {
      x,
      boxX,
      boxW,
      boxH,
      titulo: it.label,
      lines,
      dots: SERIES_CONFIG.map(s => ({ color: s.color, y: yAt(this.valorSerie(it, s.key), max) }))
    };
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const defaultRange = getRangoMesActual();

    this.from.set(q.get('from') || defaultRange.desde);
    this.to.set(q.get('to') || defaultRange.hasta);
    const g = q.get('granularity') as GranularidadUi;
    if (g === 'AUTO' || g === 'DAY' || g === 'WEEK' || g === 'MONTH') {
      this.granularity.set(g);
    }

    this.ajustarRango();
    this.cargar();
  }

  onFromChange(value: string): void {
    this.from.set(value);
    this.avisoAjuste.set('');
  }

  onToChange(value: string): void {
    this.to.set(value);
    this.avisoAjuste.set('');
  }

  setGranularity(g: GranularidadUi): void {
    if (g === this.granularity()) return;
    this.granularity.set(g);
    this.avisoAjuste.set('');
    this.ajustarRango();
    this.cargar();
  }

  /** Muestra más períodos antiguos sin cambiar el rango consultado. */
  mostrarAnteriores(): void {
    this.ventana.update(v => v + AMPLIACION_VENTANA);
    this.hoverIdx.set(null);
  }

  toggleTabla(): void {
    this.tablaManual.set(!this.tablaVisible());
  }

  resetFiltros(): void {
    const defaultRange = getRangoMesActual();
    this.from.set(defaultRange.desde);
    this.to.set(defaultRange.hasta);
    this.granularity.set('AUTO');
    this.avisoAjuste.set('');
    this.cargar();
  }

  cargar(): void {
    this.to.set(limitarAHoy(this.to()));
    if (this.rangoError()) return;
    this.cargarGrafico();
  }

  private cargarGrafico(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');
    const seq = ++this.reqGrafico;
    const gran = this.granEfectiva();

    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        from: this.from(),
        to: this.to(),
        granularity: this.granularity()
      }
    });
    this.location.replaceState(urlTree.toString());

    this.estadisticasApi.getPorTipo({
      from: this.from(),
      to: this.to(),
      granularity: gran
    }).subscribe({
      next: res => {
        if (seq !== this.reqGrafico) return;
        this.dataGranularity.set(gran);
        this.ventana.set(VENTANA_INICIAL[gran]);
        this.hoverIdx.set(null);
        this.tablaManual.set(null);
        const hoy = getLimaTodayString();
        this.puntos.set(res.filter(p => p.fecha <= hoy));
        this.cargando.set(false);
      },
      error: err => {
        if (seq !== this.reqGrafico) return;
        this.puntos.set([]);
        this.errorMensaje.set(parseApiError(err).message);
        this.cargando.set(false);
      }
    });
  }

  /** Recorta "hasta" al máximo permitido por la granularidad. */
  private ajustarRango(): void {
    this.to.set(limitarAHoy(this.to()));
    const from = this.from();
    const to = this.to();
    if (!from || !to || to < from) return;

    const lim = this.granLimite();
    const max = maxHasta(from, lim);
    if (to <= max) return;

    this.to.set(max);
    const prefijo = this.granularity() === 'AUTO' ? '' : `con granularidad ${GRAN_NOMBRE[lim]} `;
    this.avisoAjuste.set(`Rango ajustado: ${prefijo}el máximo es ${MESES_MAX_TEXTO[lim]}.`);
  }

  private formatLabel(key: string, gran: Granularidad): string {
    const parts = key.split('-');
    if (parts.length !== 3) return key;
    switch (gran) {
      case 'DAY':
        return `${parts[2]}/${parts[1]}`;
      case 'WEEK':
        return `Sem. ${parts[2]}/${parts[1]}`;
      case 'MONTH':
        return `${parts[1]}/${parts[0]}`;
    }
  }
}
