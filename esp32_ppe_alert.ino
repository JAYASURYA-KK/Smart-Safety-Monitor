/*
  ESP32 PPE Alert Receiver (LED Only)
  -----------------------------------
  Listens over USB Serial for the command "ALERT"
  sent from the PC (Python + YOLO script).

  When "ALERT" is received:
    - LED turns ON for 3 seconds
    - LED turns OFF automatically

  Wiring:
    LED (+) -> 220Ω resistor -> GPIO2
    LED (-) -> GND
*/

#define LED_PIN 2
#define ALERT_DURATION_MS 3000   // LED ON time (3 seconds)

void setup() {
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  Serial.println("ESP32 ready. Waiting for ALERT command...");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();   // Remove spaces and newline

    if (command == "ALERT") {
      triggerAlert();
    }
  }
}

void triggerAlert() {
  Serial.println("ALERT received -> LED ON");

  digitalWrite(LED_PIN, HIGH);

  delay(ALERT_DURATION_MS);

  digitalWrite(LED_PIN, LOW);

  Serial.println("Alert finished -> LED OFF");
}