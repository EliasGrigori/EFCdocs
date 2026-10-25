/* EFCdocs — Planilha: tipos do motor de cálculo.
   Ref = faixa de células (ainda não lida); Mat = matriz de valores (resultado de conta que derrama). */

export class Ref {
  constructor(abaId, l1, c1, l2, c2) {
    this.abaId = abaId;
    this.l1 = Math.min(l1, l2); this.c1 = Math.min(c1, c2);
    this.l2 = Math.max(l1, l2); this.c2 = Math.max(c1, c2);
  }
  get linhas() { return this.l2 - this.l1 + 1; }
  get colunas() { return this.c2 - this.c1 + 1; }
  get unica() { return this.l1 === this.l2 && this.c1 === this.c2; }
}

export class Mat {
  constructor(d) { this.d = d; }
  get linhas() { return this.d.length; }
  get colunas() { return this.d.length ? this.d[0].length : 0; }
  static de(lin, col, fn) {
    const d = new Array(lin);
    for (let i = 0; i < lin; i++) { d[i] = new Array(col); for (let j = 0; j < col; j++) d[i][j] = fn(i, j); }
    return new Mat(d);
  }
}

export const ehRef = (x) => x instanceof Ref;
export const ehMat = (x) => x instanceof Mat;
export const ehMultiplo = (x) => (x instanceof Ref && !x.unica) || (x instanceof Mat && (x.linhas !== 1 || x.colunas !== 1));
