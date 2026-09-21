export function relativeDate(date: Date, now = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "agora";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  const [unit, size] = units.find(([, size]) => seconds >= size)!;
  return new Intl.RelativeTimeFormat("pt-BR", { numeric: "always" }).format(-Math.floor(seconds / size), unit);
}
