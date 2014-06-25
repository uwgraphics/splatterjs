uniform sampler2D jfa;

varying vec2 coord;
varying float zcoord;

void main() {
	float dist = texture2D(jfa, coord).r;
	//gl_FragColor = vec4(vColor.r * dist / 500.0, vColor.gba);
	
	// set a lower bound
	float a = 1.0;
	if (dist <= 1.0) { 
		discard; 
	}
	
	float attenuation = 1.0 - (1.0 * dist / 200.0);
	if (zcoord > attenuation) {
		discard;
	}
	
	gl_FragColor = vec4(vec3(zcoord), a);
}