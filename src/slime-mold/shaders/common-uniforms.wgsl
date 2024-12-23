struct SlimeSimUniformsStruct {
  resolution: vec2f,

  // general
  radius: f32,
  stepSize: f32,
  decayT: f32,

  // sensor
  sensorOffset: f32,
  sensorAngle: f32,
  rotationAngle: f32,

  // other
  diffuseKernel: f32,
};

struct ColorizationUniformsStruct {
  blurTrail: f32,
  enableLighting: f32,
  slimeColor: vec3f,
};
