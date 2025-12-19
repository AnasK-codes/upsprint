// src/utils/metrics.ts

type Counter = {
  help: string;
  value: number;
};

type Gauge = {
  help: string;
  value: number;
};

const counters = new Map<string, Counter>();
const gauges = new Map<string, Gauge>();

// ---- Counters ----
export function incCounter(name: string, help: string, inc = 1) {
  const c = counters.get(name) ?? { help, value: 0 };
  c.value += inc;
  counters.set(name, c);
}

// ---- Gauges ----
export function setGauge(name: string, help: string, value: number) {
  gauges.set(name, { help, value });
}

// ---- Output (Prometheus text format) ----
export function getMetricsText(): string {
  let out = "";

  for (const [name, c] of counters) {
    out += `# HELP ${name} ${c.help}\n`;
    out += `# TYPE ${name} counter\n`;
    out += `${name} ${c.value}\n\n`;
  }

  for (const [name, g] of gauges) {
    out += `# HELP ${name} ${g.help}\n`;
    out += `# TYPE ${name} gauge\n`;
    out += `${name} ${g.value}\n\n`;
  }

  return out || "# No metrics collected yet\n";
}
