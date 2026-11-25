#!/usr/bin/env python3
"""Vértice Docs · conferente de fora do banco do aparelho (Método Sabiá 2.1, lente 7.3).

Lê os registros crus como o app grava ({ id, ficha, pacote, marca }), descompacta por conta própria
(gzip + base64 do Python, sem nenhum código do app) e compara com o que foi pedido:
  - Quadro: itens, setas, textos, rótulos, colunas do Kanban e a tarefa;
  - Documento: blocos, tipos, textos, negrito e assinatura;
  - Planilha: cada célula com valor do arquivo original, lido pelo openpyxl (se houver).

Uso: conferir-banco.py gravado.json esperado.json
Uma linha por conferência, começando por "ok" ou "FALHA". Sai com 1 se houver falha.
"""
import base64
import gzip
import json
import sys

falhas = 0


def diz(ok, texto):
    global falhas
    if not ok:
        falhas += 1
    print(("ok    " if ok else "FALHA ") + texto)


def abrir_pacote(p):
    if p["fmt"] == "json":
        dados = p["dados"]
        tamanho = len(dados.encode("utf-8"))
    elif p["fmt"] == "gzip":
        bruto = gzip.decompress(base64.b64decode(p["dados"]))
        tamanho = len(bruto)
        dados = bruto.decode("utf-8")
    else:
        raise ValueError("formato desconhecido: " + str(p["fmt"]))
    return json.loads(dados), tamanho


def texto_do_bloco(b):
    return "".join(t.get("x", "") for t in b.get("tr", []))


def conferir_quadro(c, e):
    itens = list(c["itens"].values())
    diz(len(itens) == e["itens"], f"quadro: {len(itens)} itens (pedido: {e['itens']})")
    diz(len(c["setas"]) == e["setas"], f"quadro: {len(c['setas'])} setas (pedido: {e['setas']})")
    diz(sorted(i.get("texto", "") for i in itens) == sorted(e["textos"]), "quadro: os textos dos itens são os pedidos, com acento, aspas e quebra de linha")
    diz(sorted(s.get("rotulo", "") for s in c["setas"].values()) == sorted(e["rotulos"]), "quadro: rótulos das setas")
    diz([x["nome"] for x in c["colunas"]] == e["colunas"], "quadro: colunas do Kanban na ordem")
    t = e["tarefa"]
    it = c["itens"].get(t["id"], {})
    diz(all(it.get(k) == t[k] for k in ("resp", "prazo", "g", "u", "t")), "quadro: responsável, prazo e nota GUT da tarefa")
    if "etiqueta" in e:  # v0.6.66 (N1)
        et = e["etiqueta"]
        nomes = {x.get("id"): x.get("nome") for x in c.get("etiquetas", [])}
        diz(c["itens"].get(et["id"], {}).get("fr") == et["fr"] and nomes.get(et["fr"]) == et["nome"], "quadro: etiqueta de frente do post-it e a lista de etiquetas")
    if "andamento" in e:  # v0.6.68 (R44)
        an = e["andamento"]
        it2 = c["itens"].get(an["id"], {})
        diz(c.get("fluxoKanban") is True and it2.get("col") == an["col"] and it2.get("ini") == an["ini"] and it2.get("fim") == an["fim"], "quadro: fluxo ligado ao Kanban, com quem iniciou e quem concluiu a atividade")
    cods = [i["cod"] for i in itens if "cod" in i]
    diz(len(cods) == len(set(cods)) and all(x.startswith("Q-") for x in cods), f"quadro: {len(cods)} códigos Q sem repetir")
    pontas = all(s["de"]["id"] in c["itens"] and s["para"]["id"] in c["itens"] for s in c["setas"].values())
    diz(pontas, "quadro: toda seta liga dois itens que existem")


def conferir_documento(c, e):
    bl = c["blocos"]
    diz(len(bl) == e["blocos"], f"documento: {len(bl)} blocos (pedido: {e['blocos']})")
    diz([b["t"] for b in bl] == e["tipos"], "documento: tipos dos blocos na ordem")
    textos = [texto_do_bloco(b) for b in bl if texto_do_bloco(b)]
    diz(textos == e["textos"], "documento: textos dos blocos na ordem, com acento")
    negrito = "".join(t["x"] for b in bl for t in b.get("tr", []) if t.get("n"))
    diz(negrito == e["negrito"], f"documento: o trecho em negrito é '{negrito}'")
    asn = next((b for b in bl if b["t"] == "asn"), {})
    diz(asn.get("nome") == e["assinatura"]["nome"] and asn.get("cargo") == e["assinatura"]["cargo"], "documento: assinatura com nome e cargo")
    ids = [b["id"] for b in bl]
    diz(len(ids) == len(set(ids)), "documento: nenhum bloco com id repetido")
    diz(all(k in c for k in ("pag", "cab", "rod")), "documento: página, cabeçalho e rodapé guardados")


def conferir_planilha(c, e):
    try:
        import openpyxl
        from openpyxl.utils.datetime import to_excel
        from openpyxl.utils import get_column_letter
    except Exception:
        return
    import datetime

    wb = openpyxl.load_workbook(e["arquivo"], data_only=False)
    por_nome = {a["nome"]: a for a in c["abas"].values()}
    diz([c["abas"][i]["nome"] for i in c["ordem"]] == wb.sheetnames, f"planilha: {len(wb.sheetnames)} abas na mesma ordem do arquivo")
    total = dif = formulas = sem_f = 0
    exemplo = ""
    for ws in wb.worksheets:
        cel = por_nome.get(ws.title, {}).get("cel", {})
        for linha in ws.iter_rows():
            for x in linha:
                v = x.value
                if v is None:
                    continue
                ch = get_column_letter(x.column) + str(x.row)
                g = cel.get(ch, {})
                total += 1
                if isinstance(v, str) and v.startswith("="):
                    formulas += 1
                    if not g.get("f"):
                        sem_f += 1
                        exemplo = exemplo or f"{ws.title}!{ch} sem fórmula"
                    continue
                if isinstance(v, (datetime.datetime, datetime.date, datetime.time)):
                    v = to_excel(v)
                gv = g.get("v")
                if isinstance(v, bool) or isinstance(gv, bool):
                    igual = v is gv
                elif isinstance(v, (int, float)) and isinstance(gv, (int, float)):
                    igual = abs(v - gv) <= 1e-9 * max(1.0, abs(v))
                else:
                    igual = str(v) == str(gv)
                if not igual:
                    dif += 1
                    exemplo = exemplo or f"{ws.title}!{ch}: arquivo {v!r}, guardado {gv!r}"
    diz(dif == 0, f"planilha: {total - formulas} células com valor iguais às do arquivo lido pelo openpyxl" + (f" ({dif} diferentes; ex.: {exemplo})" if dif else ""))
    diz(sem_f == 0, f"planilha: {formulas} fórmulas guardadas como fórmula" + (f" ({sem_f} sem; ex.: {exemplo})" if sem_f else ""))


def main():
    gravado = json.load(open(sys.argv[1], encoding="utf-8"))
    esperado = json.load(open(sys.argv[2], encoding="utf-8"))
    regs = {r["id"]: r for r in gravado["registros"]}
    diz(set(regs) == set(esperado), f"banco: {len(regs)} registros, um para cada arquivo pedido")
    for ident, e in esperado.items():
        r = regs.get(ident)
        if not r:
            continue
        f = r["ficha"]
        diz(f["tipo"] == e["tipo"] and f["nome"] == e["nome"] and f["status"] == "rascunho", f"ficha de '{e['nome']}': tipo, nome e situação")
        try:
            c, tamanho = abrir_pacote(r["pacote"])
        except Exception as erro:  # noqa: BLE001
            diz(False, f"pacote de '{e['nome']}' não abre fora do app: {erro}")
            continue
        diz(tamanho == r["pacote"]["bytesOriginal"], f"pacote de '{e['nome']}' abre fora do app ({r['pacote']['fmt']}, {tamanho} bytes, como o app anotou)")
        {"postits": conferir_quadro, "docx": conferir_documento, "planilha": conferir_planilha}[e["tipo"]](c, e)
    sys.exit(1 if falhas else 0)


main()
