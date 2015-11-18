uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;

uniform vec3 rgb1;
uniform vec3 rgb2;
uniform vec3 rgb3;
uniform vec3 rgb4;
uniform vec3 rgb5;

varying vec2 coord;

void main(void) {
	if (texture2D(texture1, coord).r > 0.0)
	    gl_FragColor = vec4(rgb1, 1.0);
	else if (texture2D(texture2, coord).r > 0.0) 
	    gl_FragColor = vec4(rgb2, 1.0);
	else if (texture2D(texture3, coord).r > 0.0)
		gl_FragColor = vec4(rgb3, 1.0);
	else if (texture2D(texture4, coord).r > 0.0)
		gl_FragColor = vec4(rgb4, 1.0);
	else if (texture2D(texture5, coord).r > 0.0)
		gl_FragColor = vec4(rgb5, 1.0);
	else
		gl_FragColor = vec4(0.0);
}
