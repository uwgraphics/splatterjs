uniform sampler2D maxTex;
uniform vec2 delta;
uniform float maxVal;

varying vec2 coord;

void main() {
	float val = 0.0;
	
	val = texture2D(maxTex, floor(coord * 2.0)).r;
	
	gl_FragColor = vec4(vec3(val / maxVal), 1.0);
}
