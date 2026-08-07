/*
  ESP32 PPE Alert Receiver
  --------------------------------
  Listens over USB Serial for the command "ALERT"
  sent from the PC (Python + YOLO script).
  When received: turns ON buzzer + LED for ALERT_DURATION ms, then OFF.

  Wiring:
    Buzzer (+)  -> GPIO4
    Buzzer (-)  -> GND
    LED (+)     -> 220ohm resistor -> GPIO2
    LED (-)     -> GND
*/

#define BUZZER_PIN 4
#define LED_PIN    2
#define ALERT_DURATION_MS 3000   // 3 seconds, change to 2000 for 2s

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  Serial.println("ESP32 ready. Waiting for ALERT command...");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();  // remove \r or whitespace

    if (command == "ALERT") {
      triggerAlert();
    }
  }
}

void triggerAlert() {
  Serial.println("ALERT received -> Buzzer + LED ON");
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);

  delay(ALERT_DURATION_MS);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  Serial.println("Alert finished -> OFF");
}
