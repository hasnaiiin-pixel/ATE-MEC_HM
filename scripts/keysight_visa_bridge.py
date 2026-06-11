#!/usr/bin/env python3
"""
AT-MEC_HM Keysight VISA Bridge.
Usa PyVISA + Keysight IO Libraries Suite per interrogare strumenti USBTMC/VISA.
Comandi:
  python keysight_visa_bridge.py list
  python keysight_visa_bridge.py query USB0::...::INSTR "*IDN?"
"""
import json, sys

def out(obj):
    print(json.dumps(obj, ensure_ascii=False))

def main():
    try:
        import pyvisa
    except Exception as e:
        out({"ok": False, "error": "PyVISA non installato. Eseguire: py -3 -m pip install pyvisa"})
        return 2
    try:
        rm = pyvisa.ResourceManager()
        cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
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
                # Termination standard per USBTMC/SCPI. Ignorata da backend che non la usa.
                try:
                    inst.write_termination = "\n"
                    inst.read_termination = "\n"
                except Exception:
                    pass
                if scpi.strip().endswith('?'):
                    response = inst.query(scpi).strip()
                else:
                    inst.write(scpi)
                    response = "OK"
                out({"ok": True, "resource": resource, "command": scpi, "response": response})
                return 0
            finally:
                try: inst.close()
                except Exception: pass
        out({"ok": False, "error": "Comando non riconosciuto"})
        return 2
    except Exception as e:
        out({"ok": False, "error": str(e)})
        return 1

if __name__ == "__main__":
    sys.exit(main())
