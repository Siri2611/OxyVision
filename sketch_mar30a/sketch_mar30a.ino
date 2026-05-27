#define MIC_PIN 34
#define SAMPLE_RATE 8000

void setup() {
  Serial.begin(921600); // high speed
}

unsigned long nextSampleMicros = 0;
const unsigned long sampleInterval = 1000000 / SAMPLE_RATE;

void loop() {
  unsigned long currentMicros = micros();
  
  if (currentMicros >= nextSampleMicros) {
    nextSampleMicros = currentMicros + sampleInterval;  // Schedule next exact hit!
    
    int sample = analogRead(MIC_PIN);
    byte audioByte = sample >> 4;
    Serial.write(audioByte);
  }
}
