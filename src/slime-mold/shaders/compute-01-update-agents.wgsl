// =============================================================
// Compute pass 1 -> update agents.
// =============================================================
struct Agent {
  position: vec2f,
  direction: vec2f,
}

@group(0) @binding(0) var<uniform> uSlimeSim: SlimeSimUniformsStruct;
@group(0) @binding(1) var<storage, read_write> agentsArray: array<Agent>;
@group(0) @binding(2) var readFromThisTexture: texture_2d<f32>;
@group(0) @binding(3) var writeToThisTexture: texture_storage_2d<rgba8unorm, write>;

fn rotationMatrix(degrees: f32) -> mat2x2f {
  let radians = radians(degrees); // Convert degrees to radians
  let cosTheta = cos(radians);
  let sinTheta = sin(radians);
  return mat2x2f(
    vec2f(cosTheta, -sinTheta),
    vec2f(sinTheta, cosTheta)
  );
}

fn rotate(direction: vec2f, degrees: f32) -> vec2f {
  let rotMatrix = rotationMatrix(degrees);
  return rotMatrix * direction;
}

fn checkTrail(agentPosition: vec2f, newDir: vec2f) -> f32 {
  var sum: f32 = 0.0;
  let sensorWidth: i32 = 1;
  let sensorPosition = agentPosition + uSlimeSim.sensorOffset * newDir;

  for (var x = -sensorWidth; x <= sensorWidth; x++) {
    for (var y = -sensorWidth; y <= sensorWidth; y++) {
      let sampleX = i32(sensorPosition.x) + x;
      let sampleY = i32(sensorPosition.y) + y;
      sum += textureLoad(readFromThisTexture, vec2i(sampleX, sampleY), 0).r;
    }
  }

  return sum;
}

// takes a value and converts it between 0 and 1
fn hashTo01(value: u32) -> u32 {
  return (value * 2654435761u) % 2u; // Use a prime multiplier for hashing
}

@compute
@workgroup_size(1)
fn updateAgents(
  @builtin(global_invocation_id) id: vec3u
) {
  let idx = id.x; // Index for the current workgroup invocation
  if (idx < arrayLength(&agentsArray)) {
    // =============================================================
    // 1. Motor stage -> update agents position.
    // reference: https://uwe-repository.worktribe.com/output/980579
    // =============================================================
    let uResolution: vec2f = uSlimeSim.resolution;
    let agentPosition: vec2f = agentsArray[idx].position;
    if (agentPosition.x < 0 || agentPosition.x > uResolution.x) {
      agentsArray[idx].direction.x *= -1.0;
    }
    if (agentPosition.y < 0 || agentPosition.y > uResolution.y) {
      agentsArray[idx].direction.y *= -1.0;
    }
    // In this case, we specifically want to use agents[idx].direction because that
    // is being changed, where as the local `agent` variable is not.
    // Make sure to normalize direction becaues otherwise, some agents move very slow.
    agentsArray[idx].position = agentPosition + normalize(agentsArray[idx].direction) * uSlimeSim.stepSize;

    // =============================================================
    // 2. Sensory stage -> update agents direction based on sensors.
    // reference: https://uwe-repository.worktribe.com/output/980579
    //
    // Lets say that abs(maxDegrees) = 145
    // Add degrees to go left, subtract degrees to go right.
    // =============================================================
    let uSensorAngle = uSlimeSim.sensorAngle;
    let sensorDegreeLeft = uSensorAngle;
    let sensorDegreeRight = -uSensorAngle;

    let sensorForwardDir = normalize(agentsArray[idx].direction);
    let sensorLeftDir = rotate(sensorForwardDir, sensorDegreeLeft);
    let sensorRightDir = rotate(sensorForwardDir, sensorDegreeRight);

    let F: f32 = checkTrail(agentsArray[idx].position, sensorForwardDir);
    let FL: f32 = checkTrail(agentsArray[idx].position, sensorLeftDir);
    let FR: f32 = checkTrail(agentsArray[idx].position, sensorRightDir);

    // // lets say that abs(maxDegrees) = 145
    // // add degrees to go left, subtract degrees to go right
    let uRotationAngle = uSlimeSim.rotationAngle;
    let rotationDegreeLeft = uRotationAngle;
    let rotationDegreeRight = -uRotationAngle;

    let rotationForwardDir = normalize(agentsArray[idx].direction);
    let rotationLeftDir = rotate(rotationForwardDir, rotationDegreeLeft);
    let rotationRightDir = rotate(rotationForwardDir, rotationDegreeRight);

    if (F > FL && F > FR) {
      // do nothing
    } else if (F < FL && F < FR) {
      let zeroOrOne = f32(hashTo01(u32(F + FR + FL)));
      if (zeroOrOne < 0.1) {
        agentsArray[idx].direction = rotationLeftDir;
      } else {
        agentsArray[idx].direction = rotationRightDir;
      }
    } else if (FL < FR) {
      agentsArray[idx].direction = rotationRightDir;
    } else if (FR < FL) {
      agentsArray[idx].direction = rotationLeftDir;
    } else {
      // do nothing
    }
  }

  // =============================================================
  // 3. Draw white dot with uSlimeSim.radius on texture.
  // =============================================================
  let white = vec4f(1.0, 1.0, 1.0, 1.0);
  let agentCenterPos = vec2i(agentsArray[id.x].position);

  // Setting radius to decimal, like, 2.5 makes it an f32.
  // Type f32 doesn't allow x++ or y++ which is annoying in for-loops.
  // But type f32 can be useful if we want to make a circular agent with
  // a smaller radius since we can perform checks by incrementing 0.5
  // units in the for-loop.
  let uRadius = uSlimeSim.radius;
  let rSquared = uRadius * uRadius;
  for (var x = -uRadius; x <= uRadius; x += 0.5) {
    for (var y = -uRadius; y <= uRadius; y += 0.5) {
      let offset = vec2f(x, y);
      let offsetDotProduct = dot(offset, offset);
      if (offsetDotProduct < rSquared) {
        // We need to cast offset to i32 since textureStore takes vec2i.
        // agentCenterPos has already been cast during initialization.
        let texelCoordToColorize = agentCenterPos + vec2i(offset);
        textureStore(writeToThisTexture, texelCoordToColorize, white);
      }
    }
  }
}
