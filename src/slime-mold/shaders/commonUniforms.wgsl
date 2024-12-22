struct SlimeSimSettingsStruct {
  uResolution: vec2f,

  // general
  uRadius: f32,
  uStepSize: f32,
  uDecayT: f32,

  // sensor
  uSensorOffset: f32,
  uSensorAngle: f32,
  uRotationAngle: f32,

  // other
  uDiffuseKernel: f32,
};

struct ColorizationSettingsStruct {
  // seems like boolean are not supported when being passed in as gpu buffer
  // if blurTrail == 0 disabled
  // else enabled
  blurTrail: f32,
  enableLighting: f32,
  slimeColor: vec3f,
};
