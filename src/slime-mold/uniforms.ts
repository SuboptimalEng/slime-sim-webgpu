const UNIFORMS_SLIME_SIM = {
  // simulation folder
  numOfAgents: {
    value: 20_000,
    label: 'NumOfAgents',
    min: 1_000,
    max: 60_000,
    step: 10_000,
  },
  startRadius: {
    value: 100,
    label: 'StartRadius',
    min: 50,
    max: 250,
    step: 50,
  },

  // general folder
  radius: {
    // The tweakpane UI shows 1 -> 3, but it's actually doing 0.5 -> 2.5
    // Not sure if this is a bug with the library.
    value: 1.5,
    label: 'AgentSize',
    min: 0.5,
    max: 1.5,
    step: 1,
  },
  stepSize: {
    value: 0.75,
    label: 'AgentSpeed',
    min: 0,
    max: 1.5,
    step: 0.25,
  },
  decayT: {
    value: 0.005,
    label: 'TrailDecay',
    min: 0.005,
    max: 0.02,
    step: 0.005,
  },

  // sensor settings folder
  sensorOffset: {
    value: 8,
    label: 'SensorOffset',
    min: 0,
    max: 20,
    step: 2,
  },
  sensorAngle: {
    value: 45,
    label: 'SensorAngle',
    min: 5,
    max: 180,
    step: 5,
  },
  rotationAngle: {
    value: 45,
    label: 'RotationAngle',
    min: 5,
    max: 180,
    step: 5,
  },

  // todo: implement these fields?
  // sensorWidth: 1, // not really useful?
  // diffuseKernel: 0, // blur radius, not really useful?
  // pCD: 0, // probability of random change in direction
};

const UNIFORMS_COLORIZATION = {
  blurTrail: {
    value: false,
    label: 'BlurTrail',
  },
  enableLighting: {
    value: true,
    label: 'Lighting',
  },
  slimeColor: {
    value: { r: 255, g: 0, b: 0 },
    label: 'SlimeColor',
    picker: 'inline',
    // expanded: true,
  },
};

export { UNIFORMS_SLIME_SIM, UNIFORMS_COLORIZATION };
