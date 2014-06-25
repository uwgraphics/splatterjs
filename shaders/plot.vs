#ifdef GL_ES
	precision highp float;
#endif

attribute vec2 a_position;

uniform mat3 u_xform;
uniform float u_ptsize;

void main() {
    vec3 transformedCoords = u_xform * vec3(a_position, 1.0);
    gl_Position = vec4(transformedCoords.xy, 0.0, 1.0);
    gl_PointSize = u_ptsize;
}