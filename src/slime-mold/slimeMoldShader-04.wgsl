struct Agent {
  position: vec2f,
  velocity: vec2f,
};

@group(0) @binding(0)
var<storage, read_write> agents: array<Agent>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id) gid: vec3u
) {
  let idx = gid.x; // Index for the current workgroup invocation
  if (idx < arrayLength(&agents)) {
    // Read the agent from the agents buffer
    let agent = agents[idx];
    agents[idx].position = agent.position + agent.velocity;
  }
}