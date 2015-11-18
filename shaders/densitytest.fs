uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;

uniform sampler2D maxTex;

varying vec2 coord;

void main() {
	float val1 = texture2D(texture1, coord).r;	
	float val2 = texture2D(texture2, coord).r;	
	float val3 = texture2D(texture3, coord).r;	
	float val4 = texture2D(texture4, coord).r;	
	float val5 = texture2D(texture5, coord).r;	

	float maxVal = texture2D(maxTex, vec2(0.0)).r;

	float val = max(val1, max(val2, max(val3, max(val4, val5))));
	val = val/maxVal;

	val = 1.0 - val;
	
	gl_FragColor = vec4(val, val, val, 1.0 - val);
}
