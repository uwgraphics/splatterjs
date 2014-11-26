varying vec3 vColor;

void main() {
   gl_FragColor = vec4(vColor, 1.0);
   gl_FragColor.a = 1.0 - smoothstep(0.45, 0.5, distance(gl_PointCoord, vec2(0.5)));
}