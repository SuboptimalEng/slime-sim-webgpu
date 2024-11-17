struct Agent {
  position: vec2f,
  velocity: vec2f,
};

@group(0) @binding(0)
var<storage, read_write> agents: array<Agent>;

// @group(0) @binding(1)
// var<storage, read_write> result: array<Agent>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx < arrayLength(&agents)) {
    agents[idx].position = vec2f(4.0, 4.0);
  }
}