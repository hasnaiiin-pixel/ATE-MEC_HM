#!/usr/bin/env python3
"""
AT-MEC_HM Keysight VISA Bridge.

Modalita one-shot compatibile:
  python keysight_visa_bridge.py list
  python keysight_visa_bridge.py query USB0::...::INSTR "*IDN?"

Modalita server persistente 10.1.15:
  python keysight_visa_bridge.py server USB0::...::INSTR

In modalita server lo strumento e la sessione PyVISA restano aperti. Il processo
legge una richiesta JSON per riga da stdin e restituisce una risposta JSON per
riga su stdout. Questo elimina il costo di avvio Python, import PyVISA e apertura
USBTMC per ogni singolo comando di misura.
"""
import json
import sys
import traceback


def out(obj):
    print(json.dumps(obj, ensure_ascii=False), flush=True)


def open_instrument(pyvisa, resource):
    rm = pyvisa.ResourceManager()
    inst = rm.open_resource(resource)
    inst.timeout = 10000
    try:
        inst.write_termination = "\n"
        inst.read_termination = "\n"
    except Exception:
        pass
    return rm, inst


def execute_scpi(inst, scpi):
    text = str(scpi or "").strip()
    if not text:
        return ""
    if text.endswith("?"):
        return str(inst.query(text)).strip()
    inst.write(text)
    return "OK"


def run_server(pyvisa, resource):
    rm = None
    inst = None
    try:
        rm, inst = open_instrument(pyvisa, resource)
        idn = ""
        try:
            idn = execute_scpi(inst, "*IDN?")
        except Exception:
            # Alcuni strumenti possono essere occupati nella fase iniziale; la sessione
            # resta comunque valida e il primo comando applicativo puo riprovare.
            idn = ""
        out({"event": "ready", "ok": True, "resource": resource, "idn": idn})

        for raw_line in sys.stdin:
            line = raw_line.strip()
            if not line:
                continue
            request_id = None
            try:
                req = json.loads(line)
                request_id = req.get("id")
                action = str(req.get("action") or "query").lower()
                if action == "close":
                    out({"id": request_id, "ok": True, "response": "CLOSED"})
                    break
                if action == "batch":
                    commands = req.get("commands") or []
                    responses = []
                    for command in commands:
                        responses.append(execute_scpi(inst, command))
                    out({"id": request_id, "ok": True, "responses": responses})
                    continue
                scpi = req.get("scpi") or ""
                response = execute_scpi(inst, scpi)
                out({"id": request_id, "ok": True, "response": response})
            except Exception as exc:
                out({
                    "id": request_id,
                    "ok": False,
                    "error": str(exc),
                    "trace": traceback.format_exc(limit=2),
                })
        return 0
    except Exception as exc:
        out({"event": "ready", "ok": False, "resource": resource, "error": str(exc)})
        return 1
    finally:
        try:
            if inst is not None:
                inst.close()
        except Exception:
            pass
        try:
            if rm is not None:
                rm.close()
        except Exception:
            pass


def main():
    try:
        import pyvisa
    except Exception:
        out({"ok": False, "error": "PyVISA non installato. Eseguire: py -3 -m pip install pyvisa"})
        return 2

    try:
        rm = pyvisa.ResourceManager()
        cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
        if cmd == "server":
            try:
                rm.close()
            except Exception:
                pass
            if len(sys.argv) < 3:
                out({"event": "ready", "ok": False, "error": "Uso: server <resource>"})
                return 2
            return run_server(pyvisa, sys.argv[2])

        if cmd == "list":
            resources = []
            for r in rm.list_resources():
                item = {"resource": r, "ok": True}
                try:
                    inst = rm.open_resource(r)
                    inst.timeout = 8000
                    try:
                        item["idn"] = str(inst.query("*IDN?")).strip()
                    finally:
                        inst.close()
                except Exception as e:
                    item["error"] = str(e)
                resources.append(item)
            out({"ok": True, "resources": resources})
            return 0

        if cmd == "query":
            if len(sys.argv) < 4:
                out({"ok": False, "error": "Uso: query <resource> <scpi>"})
                return 2
            resource = sys.argv[2]
            scpi = sys.argv[3]
            inst = rm.open_resource(resource)
            try:
                inst.timeout = 10000
                try:
                    inst.write_termination = "\n"
                    inst.read_termination = "\n"
                except Exception:
                    pass
                response = execute_scpi(inst, scpi)
                out({"ok": True, "resource": resource, "command": scpi, "response": response})
                return 0
            finally:
                try:
                    inst.close()
                except Exception:
                    pass

        out({"ok": False, "error": "Comando non riconosciuto"})
        return 2
    except Exception as e:
        out({"ok": False, "error": str(e)})
        return 1


if __name__ == "__main__":
    sys.exit(main())
