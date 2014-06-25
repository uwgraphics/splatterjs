#ifdef GL_ES
	precision highp float;
#endif

void main() {
   gl_FragColor = vec4(1,0,0,1);
   gl_FragColor.a = 1.0 - smoothstep(0.45, 0.5, distance(gl_PointCoord, vec2(0.5)));
}