"use client";

export function PrintButton() {
  return <button className="button-primary no-print" onClick={() => window.print()} type="button">Imprimir duas vias</button>;
}
