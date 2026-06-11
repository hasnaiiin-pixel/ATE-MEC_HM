/*
  AT-MEC HM 1.4 - ESP32-S3 JSON USB firmware stabile
  Nessuna libreria esterna richiesta.

  Mappa diretta: GPIO4 = pin scritto "4" sulla scheda.
  AT-MEC mantiene il nome logico modbus_serial, ma il trasporto reale è USB JSON.

  Monitor Seriale 115200:
    {"cmd":"info"}
    {"cmd":"writeDigital","gpio":4,"value":1}
    {"cmd":"readDigital","gpio":4}
    {"cmd":"readAnalog","gpio":1}
*/

#include <Arduino.h>

static const uint32_t BAUD = 115200;
static String lineBuffer;
static bool pinConfigured[49];
static uint8_t pinModeCache[49]; // 0 unknown, 1 input, 2 output

bool isAllowedGpio(int gpio) {
  if (gpio < 1 || gpio > 48) return false;
  if (gpio == 0) return false;               // BOOT
  if (gpio == 19 || gpio == 20) return false; // USB D-/D+
  if (gpio == 43 || gpio == 44) return false; // UART0 debug/programmazione
  if (gpio == 45 || gpio == 46) return false; // strap particolari
  return true;
}

bool isAnalogGpio(int gpio) {
  return gpio >= 1 && gpio <= 18;
}

int extractInt(const String &s, const char *key, int fallback) {
  String k = String("\"") + key + "\"";
  int p = s.indexOf(k);
  if (p < 0) return fallback;
  p = s.indexOf(':', p);
  if (p < 0) return fallback;
  p++;
  while (p < (int)s.length() && (s[p] == ' ' || s[p] == '\t')) p++;
  bool neg = false;
  if (p < (int)s.length() && s[p] == '-') { neg = true; p++; }
  int value = 0;
  bool found = false;
  while (p < (int)s.length() && isDigit(s[p])) {
    found = true;
    value = value * 10 + (s[p] - '0');
    p++;
  }
  if (!found) return fallback;
  return neg ? -value : value;
}

bool extractBoolValue(const String &s, const char *key, bool fallback) {
  String k = String("\"") + key + "\"";
  int p = s.indexOf(k);
  if (p < 0) return fallback;
  p = s.indexOf(':', p);
  if (p < 0) return fallback;
  p++;
  while (p < (int)s.length() && (s[p] == ' ' || s[p] == '\t')) p++;
  if (s.substring(p).startsWith("true")) return true;
  if (s.substring(p).startsWith("false")) return false;
  int iv = extractInt(s, key, fallback ? 1 : 0);
  return iv != 0;
}

bool hasCmd(const String &s, const char *cmd) {
  return s.indexOf(String("\"cmd\"") ) >= 0 && s.indexOf(String("\"") + cmd + "\"") >= 0;
}

int getId(const String &s) {
  return extractInt(s, "id", -1);
}

int getGpio(const String &s) {
  int gpio = extractInt(s, "gpio", -1);
  if (gpio < 0) gpio = extractInt(s, "channel", -1); // retrocompatibilità
  return gpio;
}

void printPrefix(int id) {
  Serial.print("{\"ok\":");
}

void sendError(int id, const char *err) {
  Serial.print("{\"ok\":false");
  if (id >= 0) { Serial.print(",\"id\":"); Serial.print(id); }
  Serial.print(",\"error\":\"");
  Serial.print(err);
  Serial.println("\"}");
}

void sendInfo(int id) {
  Serial.print("{\"ok\":true");
  if (id >= 0) { Serial.print(",\"id\":"); Serial.print(id); }
  Serial.println(",\"board\":\"ESP32-S3 DevKitC-1 N16R8\",\"fw\":\"AT-MEC_HM_1_4_JSON_DIRECT_GPIO_0.2\",\"baud\":115200,\"pinout\":\"GPIO number equals board label\",\"transport\":\"USB JSON logical modbus_serial\"}");
}

void handleLine(String s) {
  s.trim();
  if (s.length() == 0) return;
  int id = getId(s);

  if (hasCmd(s, "info") || hasCmd(s, "hello") || hasCmd(s, "ping")) {
    sendInfo(id);
    return;
  }

  if (hasCmd(s, "pinMode")) {
    int gpio = getGpio(s);
    if (!isAllowedGpio(gpio)) { sendError(id, "GPIO mancante/non valido"); return; }
    bool output = s.indexOf("\"DO\"") >= 0 || s.indexOf("\"OUTPUT\"") >= 0 || s.indexOf("\"output\"") >= 0;
    if (output) { pinMode(gpio, OUTPUT); pinModeCache[gpio] = 2; }
    else { pinMode(gpio, INPUT_PULLDOWN); pinModeCache[gpio] = 1; }
    pinConfigured[gpio] = true;
    Serial.print("{\"ok\":true");
    if (id >= 0) { Serial.print(",\"id\":"); Serial.print(id); }
    Serial.print(",\"cmd\":\"pinMode\",\"gpio\":"); Serial.print(gpio);
    Serial.println("}");
    return;
  }

  if (hasCmd(s, "writeDigital")) {
    int gpio = getGpio(s);
    bool value = extractBoolValue(s, "value", false);
    if (!isAllowedGpio(gpio)) { sendError(id, "GPIO mancante/non valido"); return; }
    pinMode(gpio, OUTPUT);
    pinConfigured[gpio] = true;
    pinModeCache[gpio] = 2;
    digitalWrite(gpio, value ? HIGH : LOW);
    delay(2);
    int readback = digitalRead(gpio);
    Serial.print("{\"ok\":true");
    if (id >= 0) { Serial.print(",\"id\":"); Serial.print(id); }
    Serial.print(",\"cmd\":\"writeDigital\",\"gpio\":"); Serial.print(gpio);
    Serial.print(",\"value\":"); Serial.print(value ? 1 : 0);
    Serial.print(",\"readback\":"); Serial.print(readback == HIGH ? 1 : 0);
    Serial.println("}");
    return;
  }

  if (hasCmd(s, "readDigital")) {
    int gpio = getGpio(s);
    if (!isAllowedGpio(gpio)) { sendError(id, "GPIO mancante/non valido"); return; }
    // Non cambiare modo se il pin è già output: così il feedback DO non spegne l'uscita.
    if (!pinConfigured[gpio]) {
      pinMode(gpio, INPUT_PULLDOWN);
      pinConfigured[gpio] = true;
      pinModeCache[gpio] = 1;
    }
    int value = digitalRead(gpio);
    Serial.print("{\"ok\":true");
    if (id >= 0) { Serial.print(",\"id\":"); Serial.print(id); }
    Serial.print(",\"cmd\":\"readDigital\",\"gpio\":"); Serial.print(gpio);
    Serial.print(",\"mode\":\""); Serial.print(pinModeCache[gpio] == 2 ? "OUTPUT" : "INPUT"); Serial.print("\"");
    Serial.print(",\"value\":"); Serial.print(value == HIGH ? 1 : 0);
    Serial.println("}");
    return;
  }

  if (hasCmd(s, "readAnalog")) {
    int gpio = getGpio(s);
    if (!isAllowedGpio(gpio) || !isAnalogGpio(gpio)) { sendError(id, "GPIO analogico mancante/non valido"); return; }
    int raw = analogRead(gpio);
    float voltage = (raw / 4095.0f) * 3.3f;
    Serial.print("{\"ok\":true");
    if (id >= 0) { Serial.print(",\"id\":"); Serial.print(id); }
    Serial.print(",\"cmd\":\"readAnalog\",\"gpio\":"); Serial.print(gpio);
    Serial.print(",\"raw\":"); Serial.print(raw);
    Serial.print(",\"value\":"); Serial.print(voltage, 4);
    Serial.print(",\"voltage\":"); Serial.print(voltage, 4);
    Serial.println("}");
    return;
  }

  sendError(id, "comando non riconosciuto");
}

void setup() {
  Serial.begin(BAUD);
  analogReadResolution(12);
  delay(800);
  Serial.println("{\"ok\":true,\"event\":\"boot\",\"fw\":\"AT-MEC_HM_1_4_JSON_DIRECT_GPIO_0.2\"}");
}

void loop() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (lineBuffer.length() > 0) {
        handleLine(lineBuffer);
        lineBuffer = "";
      }
    } else {
      if (lineBuffer.length() < 768) lineBuffer += c;
      else lineBuffer = "";
    }
  }
}
