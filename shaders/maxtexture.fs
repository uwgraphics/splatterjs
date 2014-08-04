uniform sampler2D max1;
uniform sampler2D max2;

varying vec2 coord;

void main(void) {
	float maxVal = max(texture2D(max1, coord).r, texture2D(max2, coord).r);
	
	gl_FragColor = vec4(maxVal, 0.0, 0.0, 1.0);
}
