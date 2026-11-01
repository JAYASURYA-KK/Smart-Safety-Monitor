#include <WiFi.h>
#include <WiFiManager.h>          // "WiFiManager" by tzapu
#include <Firebase_ESP_Client.h>  // "Firebase Arduino Client Library for ESP8266 and ESP32" by Mobizt
#include <DHT.h>
#include <Wire.h>
#include <math.h>

// ================= CREDENTIALS & SECRETS =================
// If secrets.h exists locally, load private credentials.
// Otherwise, default placeholders are used (see secrets.h.example).
#if __has_include("secrets.h")
  #include "secrets.h"
#else
  #define API_KEY        "YOUR_FIREBASE_API_KEY"
  #define DATABASE_URL   "https://your-project-id-default-rtdb.firebaseio.com"
  #define USER_EMAIL     "worker@smart-safety.com"
  #define USER_PASSWORD  "your_password"
  #define AP_PASSWORD    "12345678"
#endif

// ================= WI-FI SETUP HOTSPOT =================
// First time: connect phone to "Helmet-Setup" (password in secrets.h), open 192.168.4.1,
// choose your Wi-Fi and enter its password. It is saved and reused every power-on.
#ifndef AP_NAME
  #define AP_NAME      "Helmet-Setup"
#endif
// Hold the BOOT button for 5 seconds to erase saved Wi-Fi and reopen the setup page.
#define RESET_WIFI_PIN  0

// ---------- Pins ----------
#define DHTPIN      4
#define DHTTYPE     DHT22      // change to DHT11 if your sensor is DHT11
#define MQ7_PIN     27
#define BUZZER_PIN  25
#define SOS_PIN     26         // switch between G26 and GND
#define SDA_PIN     21
#define SCL_PIN     22

// ---------- Thresholds ----------
#define HIGH_TEMP          35.0     // degC
#define IMPACT_THRESHOLD   2.5      // g
#define IMPACT_HOLD_MS     5000
#define SOS_HOLD_MS        3000     // SOS stays active this long after the switch is released

// ---------- Timing ----------
#define MPU_INTERVAL_MS      20
#define DHT_INTERVAL_MS      2000
#define SEND_INTERVAL_MS     3000
#define HISTORY_INTERVAL_MS  30000

// ---------- MPU6050 ----------
#define MPU_ADDR      0x68
#define PWR_MGMT_1    0x6B
#define ACCEL_CONFIG  0x1C
#define ACCEL_XOUT_H  0x3B

DHT dht(DHTPIN, DHTTYPE);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool mpuOK = false;

float temperature = NAN, humidity = NAN;
bool dhtOK = false;

float ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0, mpuTemp = 0;
float totalG = 0, peakG = 0;
unsigned long impactUntil = 0;
unsigned long sosUntil = 0;

unsigned long lastMpu = 0, lastDht = 0, lastSend = 0, lastHistory = 0;
unsigned long bootHeldSince = 0;
bool prevAlert = false;
bool sendNow = false;

// ================= MPU =================
bool writeReg(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

bool mpuInit() {
  if (!writeReg(PWR_MGMT_1, 0x00)) return false;   // wake up
  delay(100);
  return writeReg(ACCEL_CONFIG, 0x10);             // +-8g, 4096 LSB/g
}

bool mpuRead() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)14) != 14) return false;

  int16_t v[7];
  for (int i = 0; i < 7; i++) {
    uint8_t hi = Wire.read();
    uint8_t lo = Wire.read();
    v[i] = (int16_t)((hi << 8) | lo);
  }
  ax = v[0] / 4096.0;                // g
  ay = v[1] / 4096.0;
  az = v[2] / 4096.0;
  mpuTemp = v[3] / 340.0 + 36.53;
  gx = v[4] / 131.0 * 0.0174533;     // rad/s
  gy = v[5] / 131.0 * 0.0174533;
  gz = v[6] / 131.0 * 0.0174533;
  return true;
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== SMART CONSTRUCTION SITE SAFETY ===");

  pinMode(MQ7_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(SOS_PIN, INPUT_PULLUP);
  pinMode(RESET_WIFI_PIN, INPUT_PULLUP);

  dht.begin();
  Wire.begin(SDA_PIN, SCL_PIN);

  mpuOK = mpuInit();
  Serial.println(mpuOK ? "MPU6050 ready" : "MPU6050 not responding (continuing without it)");

  // ---- Wi-Fi via WiFiManager ----
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);   // setup page stays open 3 minutes, then continues offline
  wm.setConnectTimeout(20);
  Serial.println("Connecting to saved Wi-Fi... (if none, hotspot '" AP_NAME "' opens, page 192.168.4.1)");
  bool connected = wm.autoConnect(AP_NAME, AP_PASSWORD);
  if (connected) {
    Serial.print("Wi-Fi connected: ");
    Serial.println(WiFi.SSID());
  } else {
    Serial.println("Wi-Fi not connected - safety alarm works offline, will keep retrying");
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("SYSTEM READY");
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  // ---- 0. Hold BOOT for 5 s = forget Wi-Fi and reopen setup page ----
  if (digitalRead(RESET_WIFI_PIN) == LOW) {
    if (bootHeldSince == 0) bootHeldSince = now;
    else if (now - bootHeldSince > 5000) {
      Serial.println("Erasing saved Wi-Fi and restarting...");
      WiFiManager wm;
      wm.resetSettings();
      delay(500);
      ESP.restart();
    }
  } else {
    bootHeldSince = 0;
  }

  // ---- 1. Gas (every loop) ----
  int mq7 = digitalRead(MQ7_PIN);
  bool gasAlert = (mq7 == LOW);

  // ---- 2. SOS switch ----
  if (digitalRead(SOS_PIN) == LOW) sosUntil = now + SOS_HOLD_MS;
  bool sos = (long)(sosUntil - now) > 0;

  // ---- 3. MPU (fast, for impact detection) ----
  if (mpuOK && now - lastMpu >= MPU_INTERVAL_MS) {
    lastMpu = now;
    if (mpuRead()) {
      totalG = sqrt(ax * ax + ay * ay + az * az);
      if (totalG > peakG) peakG = totalG;
      if (totalG >= IMPACT_THRESHOLD) impactUntil = now + IMPACT_HOLD_MS;
    }
  }
  bool impact = (long)(impactUntil - now) > 0;

  // ---- 4. DHT (slow) ----
  if (now - lastDht >= DHT_INTERVAL_MS) {
    lastDht = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    dhtOK = !isnan(t) && !isnan(h);
    if (dhtOK) { temperature = t; humidity = h; }
  }
  bool highTemp = dhtOK && temperature >= HIGH_TEMP;

  // ---- 5. Buzzer (non-blocking) ----
  bool alertNow = gasAlert || highTemp || impact || sos;
  digitalWrite(BUZZER_PIN, alertNow ? HIGH : LOW);

  if (alertNow && !prevAlert) sendNow = true;   // upload immediately on new alert
  prevAlert = alertNow;

  // ---- 6. Firebase upload ----
  if (now - lastSend >= SEND_INTERVAL_MS || sendNow) {
    lastSend = now;
    bool urgent = sendNow;
    sendNow = false;

    Serial.printf("Temp: %.1f C | Hum: %.1f %% | Gas: %s | Peak: %.2f g | Impact: %s | SOS: %s | MPU: %s\n",
                  dhtOK ? temperature : -999.0, dhtOK ? humidity : -999.0,
                  gasAlert ? "ALERT" : "ok", peakG,
                  impact ? "YES" : "no", sos ? "YES" : "no", mpuOK ? "ok" : "fail");

    if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
      FirebaseJson data;
      data.set("temperature", dhtOK ? temperature : -999);
      data.set("humidity", dhtOK ? humidity : -999);
      data.set("dht_ok", dhtOK);
      data.set("high_temp_alert", highTemp);
      data.set("mq7_do", mq7);
      data.set("gas_alert", gasAlert);
      data.set("sos_alert", sos);
      data.set("mpu_ok", mpuOK);
      data.set("impact_alert", impact);
      data.set("peak_g", peakG);
      data.set("accel_x", ax);
      data.set("accel_y", ay);
      data.set("accel_z", az);
      data.set("gyro_x", gx);
      data.set("gyro_y", gy);
      data.set("gyro_z", gz);
      data.set("mpu_temperature", mpuTemp);
      data.set("any_alert", alertNow);
      data.set("uptime_s", (int)(now / 1000));

      if (Firebase.RTDB.setJSON(&fbdo, "/sensors/latest", &data)) {
        Serial.println("Latest data uploaded");
      } else {
        Serial.print("Firebase error: ");
        Serial.println(fbdo.errorReason());
      }

      // history: every 30 s, or immediately when an alert starts
      if (urgent || now - lastHistory >= HISTORY_INTERVAL_MS) {
        lastHistory = now;
        if (!Firebase.RTDB.pushJSON(&fbdo, "/sensors/history", &data)) {
          Serial.print("History error: ");
          Serial.println(fbdo.errorReason());
        }
      }
    } else if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Wi-Fi disconnected - upload skipped");
    }

    peakG = 0;   // reset peak after each report
  }
}
