import { arrayOf, f32, struct, vec2f, vec3f } from 'typegpu/data';

export const SlimeSimUniformsStruct = struct({
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
});

export const ColorizationUniformsStruct = struct({
  blurTrail: f32,
  enableLighting: f32,
  slimeColor: vec3f,
});

export const AgentStruct = struct({
  position: vec2f,
  direction: vec2f,
});

export const AgentArray = (count: number) => arrayOf(AgentStruct, count);
