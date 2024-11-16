@vertex
fn main_vertex(
  @location(0) position: vec2<f32>
) -> @builtin(position) vec4<f32> {
    return vec4(position, 0.0, 1.0);
}

@fragment
fn main_fragment() -> @location(0) vec4<f32> {
    return vec4(1.0, 0.0, 0.0, 1.0);
}